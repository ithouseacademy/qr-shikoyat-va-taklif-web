from django.conf import settings
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.organizations.permissions import get_membership
from .models import Notification, NotificationPreference, PushSubscription
from .services import serialize


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.Serializer
    filterset_fields = ['is_read', 'type']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *a, **kw):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        return self.get_paginated_response([serialize(n) for n in page])

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        return Response({'count': self.get_queryset().filter(is_read=False).count()})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'ok': True})

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        self.get_queryset().filter(pk=pk).update(is_read=True)
        return Response({'ok': True})


PREF_FIELDS = ['push_enabled', 'new_suggestion', 'new_complaint', 'new_rating', 'assigned', 'reply', 'status_changed', 'system']


class PreferenceView(APIView):
    def _get(self, request):
        return NotificationPreference.objects.get_or_create(user=request.user)[0]

    def get(self, request):
        p = self._get(request)
        return Response({f: getattr(p, f) for f in PREF_FIELDS})

    def put(self, request):
        p = self._get(request)
        for f in PREF_FIELDS:
            if f in request.data:
                setattr(p, f, bool(request.data[f]))
        p.save()
        return Response({f: getattr(p, f) for f in PREF_FIELDS})


class VapidKeyView(APIView):
    def get(self, request):
        return Response({'public_key': settings.VAPID_PUBLIC_KEY})


class SubscribeView(APIView):
    def post(self, request):
        m = get_membership(request)
        if not m:
            return Response({'detail': 'Tashkilot topilmadi'}, status=403)
        d = request.data
        keys = d.get('keys') or {}
        if not d.get('endpoint') or not keys.get('p256dh') or not keys.get('auth'):
            return Response({'detail': 'Subscription noto‘g‘ri'}, status=400)
        sub, _ = PushSubscription.objects.update_or_create(
            endpoint=d['endpoint'],
            defaults={'user': request.user, 'organization': m.organization, 'p256dh': keys['p256dh'], 'auth': keys['auth'],
                      'user_agent': request.META.get('HTTP_USER_AGENT', '')[:300], 'failures': 0})
        return Response({'id': sub.id}, status=201)


class UnsubscribeView(APIView):
    def post(self, request):
        PushSubscription.objects.filter(user=request.user, endpoint=request.data.get('endpoint', '')).delete()
        return Response({'ok': True})


class MyDevicesView(APIView):
    def get(self, request):
        return Response([{'id': s.id, 'user_agent': s.user_agent, 'created_at': s.created_at, 'endpoint': s.endpoint}
                         for s in PushSubscription.objects.filter(user=request.user)])
