from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from django_filters import rest_framework as df
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.accounts.models import User
from apps.audit.services import audit_log
from apps.notifications.services import notify, staff_users
from apps.organizations.models import OrganizationMembership
from apps.organizations.permissions import TenantMixin
from apps.qr_codes.models import QRCode, QRScan
from .models import Feedback, FeedbackAttachment, FeedbackCategory, FeedbackComment, FeedbackStatusHistory
from .serializers import (CategorySerializer, CommentSerializer, FeedbackDetailSerializer, FeedbackListSerializer,
                          PublicFeedbackSerializer)
from .services import on_feedback_created
from .uploads import validate_attachments


class FeedbackFilter(df.FilterSet):
    date_from = df.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = df.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = Feedback
        fields = ['status', 'type', 'branch', 'department', 'category', 'assigned_to', 'qr']


class FeedbackViewSet(TenantMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    write_roles = ('owner', 'admin', 'manager', 'employee')
    queryset = Feedback.objects.select_related('category', 'branch', 'department', 'assigned_to', 'qr').prefetch_related('attachments')
    filterset_class = FeedbackFilter
    search_fields = ['number', 'name', 'phone', 'text', 'from_person', 'to_person', 'reason']
    ordering_fields = ['created_at', 'status', 'rating']

    def get_serializer_class(self):
        return FeedbackDetailSerializer if self.action == 'retrieve' else FeedbackListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.membership().role == 'employee':  # xodim faqat o'ziga biriktirilganni ko'radi
            qs = qs.filter(assigned_to=self.request.user)
        return qs

    def destroy(self, request, *a, **kw):
        if self.membership().role not in ('owner', 'admin'):
            raise PermissionDenied()
        return super().destroy(request, *a, **kw)

    def _change_status(self, fb, new, note=''):
        old = fb.status
        fb.status = new
        fb.resolved_at = timezone.now() if new in ('resolved', 'rejected') else None
        fb.save(update_fields=['status', 'resolved_at', 'updated_at'])
        FeedbackStatusHistory.objects.create(feedback=fb, changed_by=self.request.user, from_status=old, to_status=new, note=note)

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        fb = self.get_object()
        new = request.data.get('status')
        if new not in dict(Feedback.STATUSES):
            raise ValidationError({'status': 'Noto‘g‘ri holat'})
        cfg = fb.organization.settings
        note = str(request.data.get('note', ''))[:300]
        resolution = str(request.data.get('resolution_note', '')).strip()[:3000]
        if new == 'resolved' and cfg.collect_resolution:
            if cfg.require_resolution and not resolution:
                raise ValidationError({'resolution_note': 'Hal qilindi izohini kiriting'})
            if resolution:
                fb.resolution_note = resolution
                fb.save(update_fields=['resolution_note', 'updated_at'])
                note = note or resolution[:300]
        if new != fb.status:
            self._change_status(fb, new, note)
            audit_log(request, 'status_change', fb, meta={'to': new})
            targets = set(staff_users(fb.organization, ('owner', 'admin')))
            if fb.assigned_to:
                targets.add(fb.assigned_to)
            targets.discard(request.user)
            transaction.on_commit(lambda: notify(fb.organization, 'status_changed', 'Holat o‘zgardi',
                                                 f'{fb.number}: {fb.get_status_display()}', targets, fb))
        return Response(FeedbackDetailSerializer(fb, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        if self.membership().role == 'employee':
            raise PermissionDenied()
        fb = self.get_object()
        uid = request.data.get('user_id')
        if uid in (None, ''):
            fb.assigned_to = None
            fb.save(update_fields=['assigned_to', 'updated_at'])
        else:
            m = OrganizationMembership.objects.filter(organization=self.org(), user_id=uid).select_related('user').first()
            if not m:
                raise ValidationError({'user_id': 'Xodim topilmadi'})
            fb.assigned_to = m.user
            fb.save(update_fields=['assigned_to', 'updated_at'])
            if fb.status == 'new':
                self._change_status(fb, 'in_progress', f'{m.user.full_name} ga biriktirildi')
            audit_log(request, 'assign', fb, meta={'user': m.user_id})
            if m.user != request.user:
                transaction.on_commit(lambda: notify(fb.organization, 'assigned', 'Murojaat biriktirildi',
                                                     f'Sizga {fb.number} raqamli murojaat biriktirildi.', [m.user], fb))
        return Response(FeedbackDetailSerializer(fb, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def comments(self, request, pk=None):
        fb = self.get_object()
        s = CommentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        c = s.save(feedback=fb, author=request.user)
        if not c.is_internal and fb.status in ('new', 'in_progress'):
            self._change_status(fb, 'answered', 'Mijozga javob berildi')
        targets = set(staff_users(fb.organization, ('owner', 'admin')))
        if fb.assigned_to:
            targets.add(fb.assigned_to)
        targets.discard(request.user)
        transaction.on_commit(lambda: notify(fb.organization, 'reply', 'Yangi izoh/javob',
                                             f'{request.user.full_name}: {c.text[:80]}', targets, fb))
        return Response(FeedbackDetailSerializer(fb, context={'request': request}).data, status=201)


class CategoryViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = FeedbackCategory.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None


# ------------------- PUBLIC (anonim, faqat faol QR orqali) -------------------
def get_active_qr(token):
    return (QRCode.objects.select_related('organization', 'organization__settings', 'branch', 'department')
            .filter(token=token, is_active=True, organization__status='active').first())


class PublicQRView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public_read'

    def get(self, request, token):
        qr = get_active_qr(token)
        if not qr:
            return Response({'detail': 'QR-kod topilmadi yoki o‘chirilgan'}, status=404)
        QRScan.objects.create(qr=qr, organization=qr.organization, user_agent=request.META.get('HTTP_USER_AGENT', '')[:300])
        o, s = qr.organization, qr.organization.settings
        cats = FeedbackCategory.objects.filter(organization=o, is_active=True)
        return Response({
            'organization': {'name': o.name, 'slug': o.slug, 'logo': o.logo.url if o.logo else None,
                             'primary_color': s.primary_color, 'welcome_text': s.welcome_text, 'contact_phone': s.contact_phone,
                             'contact_email': s.contact_email, 'address': s.address, 'social_links': s.social_links or [],
                             'menu_links': s.menu_links or [], 'show_branding': s.show_branding,
                             'collect_name': s.collect_name, 'require_name': s.require_name,
                             'collect_complaint_context': s.collect_complaint_context,
                             'require_complaint_context': s.require_complaint_context, 'show_resolution': s.show_resolution},
            'branch': qr.branch.name if qr.branch else None,
            'department': qr.department.name if qr.department else None,
            'location': qr.location,
            'categories': [{'id': c.id, 'name': c.name, 'kind': c.kind} for c in cats],
        })


class PublicSubmitView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public_submit'

    def post(self, request, token):
        qr = get_active_qr(token)
        if not qr:
            return Response({'detail': 'QR-kod topilmadi yoki o‘chirilgan'}, status=404)
        if request.data.get('website'):  # honeypot
            return Response({'number': 'FB-OK', 'detail': 'Qabul qilindi'}, status=201)
        key = (request.headers.get('Idempotency-Key') or '')[:64] or None
        org = qr.organization
        if key:
            ex = Feedback.objects.filter(organization=org, idempotency_key=key).first()
            if ex:
                return Response({'number': ex.number, 'duplicate': True}, status=200)
        s = PublicFeedbackSerializer(data=request.data, context={'org': org})
        s.is_valid(raise_exception=True)
        d = s.validated_data
        cfg = org.settings
        cat = None
        if d.get('category'):
            cat = FeedbackCategory.objects.filter(pk=d['category'], organization=org, is_active=True).first()
            if not cat:
                raise ValidationError({'category': 'Kategoriya noto‘g‘ri'})
        files = request.FILES.getlist('attachments')
        validate_attachments(files)
        extra = {}
        if d['type'] == 'complaint' and cfg.collect_complaint_context:
            extra = {'from_person': d.get('from_person', ''), 'to_person': d.get('to_person', ''),
                     'reason': d.get('reason', '')}
        try:
            with transaction.atomic():
                fb = Feedback.objects.create(
                    organization=org, qr=qr, branch=qr.branch, department=qr.department, type=d['type'], category=cat,
                    name=d.get('name', '') if cfg.collect_name else '', phone=d.get('phone', ''),
                    text=d.get('text', ''), rating=d.get('rating'), idempotency_key=key, **extra)
                FeedbackStatusHistory.objects.create(feedback=fb, to_status='new', note='Mijoz yubordi')
                for f in files:
                    FeedbackAttachment.objects.create(feedback=fb, file=f)
                on_feedback_created(fb)
        except IntegrityError:  # parallel takroriy so'rov
            ex = Feedback.objects.filter(organization=org, idempotency_key=key).first()
            if ex:
                return Response({'number': ex.number, 'duplicate': True}, status=200)
            raise
        return Response({'number': fb.number, 'detail': 'Murojaatingiz qabul qilindi'}, status=201)


class PublicTrackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public_read'

    def get(self, request, number):
        fb = Feedback.objects.filter(number=number.upper()).select_related('organization').first()
        if not fb:
            return Response({'detail': 'Murojaat topilmadi'}, status=404)
        return Response({
            'number': fb.number, 'organization': fb.organization.name, 'type': fb.get_type_display(),
            'status': fb.status, 'status_display': fb.get_status_display(), 'created_at': fb.created_at,
            'from_person': fb.from_person, 'to_person': fb.to_person, 'reason': fb.reason,
            'resolution_note': fb.resolution_note if fb.organization.settings.show_resolution else '',
            'replies': [{'text': c.text, 'created_at': c.created_at} for c in fb.comments.filter(is_internal=False)],
        })