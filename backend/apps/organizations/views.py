from django.db import transaction
from django.db.models import Count, Q
from rest_framework import mixins, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.models import User
from apps.audit.services import audit_log
from .models import Organization, OrganizationMembership
from .permissions import IsSuperAdmin, OrgRolePermission, TenantMixin, get_membership
from .serializers import MembershipSerializer, OrganizationSerializer, StaffCreateSerializer


class OrganizationView(APIView):
    permission_classes = [IsAuthenticated, OrgRolePermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        return Response(OrganizationSerializer(get_membership(request).organization, context={'request': request}).data)

    def patch(self, request):
        org = get_membership(request).organization
        data = request.data
        if hasattr(data, 'dict'):  # multipart: settings.* maydonlari
            raw = data.dict()
            data = {k: v for k, v in raw.items() if k in ('name', 'logo')}
            st = {k.split('.', 1)[1]: v for k, v in raw.items() if k.startswith('settings.')}
            if st:
                data['settings'] = st
            if 'logo' in request.FILES:
                from apps.feedback.uploads import validate_image
                validate_image(request.FILES['logo'])
                data['logo'] = request.FILES['logo']
        s = OrganizationSerializer(org, data=data, partial=True, context={'request': request})
        s.is_valid(raise_exception=True)
        s.save()
        audit_log(request, 'update', org)
        return Response(s.data)


class MembershipViewSet(TenantMixin, mixins.ListModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = OrganizationMembership.objects.select_related('user')
    serializer_class = MembershipSerializer
    search_fields = ['user__full_name', 'user__email', 'user__phone']
    filterset_fields = ['role']

    def create(self, request):
        if self.membership().role not in self.write_roles:
            raise PermissionDenied()
        s = StaffCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        with transaction.atomic():
            user = User.objects.create_user(email=d['email'], password=d['password'], full_name=d['full_name'], phone=d.get('phone'))
            m = OrganizationMembership.objects.create(user=user, organization=self.org(), role=d['role'])
        audit_log(request, 'create', m, entity='Membership')
        return Response(MembershipSerializer(m).data, status=201)

    def perform_update(self, serializer):
        inst = serializer.instance
        new_role = self.request.data.get('role')
        if inst.role == 'owner' or new_role == 'owner':
            raise ValidationError({'role': 'Owner rolini o‘zgartirib bo‘lmaydi'})
        if new_role not in ('admin', 'manager', 'employee'):
            raise ValidationError({'role': 'Noto‘g‘ri rol'})
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if instance.role == 'owner':
            raise ValidationError('Ownerni o‘chirib bo‘lmaydi')
        user = instance.user
        audit_log(self.request, 'delete', instance, entity='Membership')
        instance.delete()
        user.is_active = False  # akkaunt bitta tashkilotga bog'langan
        user.save(update_fields=['is_active'])


# ---------- Super Admin ----------
class AdminOrganizationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsSuperAdmin]
    serializer_class = OrganizationSerializer
    search_fields = ['name', 'slug']
    filterset_fields = ['status']

    def get_queryset(self):
        return Organization.objects.select_related('settings').annotate(
            feedback_count=Count('feedbacks', distinct=True), members_count=Count('memberships', distinct=True),
            qr_count=Count('qr_codes', filter=Q(qr_codes__is_active=True), distinct=True)).order_by('-created_at')

    def get_serializer_class(self):
        from rest_framework import serializers

        class S(OrganizationSerializer):
            feedback_count = serializers.IntegerField(read_only=True)
            members_count = serializers.IntegerField(read_only=True)
            qr_count = serializers.IntegerField(read_only=True)

            class Meta(OrganizationSerializer.Meta):
                fields = OrganizationSerializer.Meta.fields + ['feedback_count', 'members_count', 'qr_count']
                read_only_fields = ['id', 'slug', 'created_at']
        return S

    def perform_update(self, serializer):
        obj = serializer.save()
        audit_log(self.request, 'admin_update_org', obj, meta={'status': obj.status})


class AdminStatsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.feedback.models import Feedback
        from apps.qr_codes.models import QRCode, QRScan
        return Response({
            'organizations': Organization.objects.count(),
            'active_organizations': Organization.objects.filter(status='active').count(),
            'blocked_organizations': Organization.objects.filter(status='blocked').count(),
            'users': User.objects.count(),
            'feedbacks': Feedback.objects.count(),
            'active_qr': QRCode.objects.filter(is_active=True).count(),
            'scans': QRScan.objects.count(),
        })


class AdminUserViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsSuperAdmin]
    search_fields = ['email', 'full_name', 'phone']

    def get_queryset(self):
        return User.objects.order_by('-date_joined')

    def get_serializer_class(self):
        from rest_framework import serializers

        class S(serializers.ModelSerializer):
            organization = serializers.SerializerMethodField()

            class Meta:
                model = User
                fields = ['id', 'email', 'phone', 'full_name', 'is_active', 'is_superuser', 'organization']
                read_only_fields = ['id', 'email', 'phone', 'full_name', 'is_superuser', 'organization']

            def get_organization(self, u):
                m = u.memberships.select_related('organization').first()
                return m.organization.name if m else None
        return S
