from rest_framework import generics, serializers
from rest_framework.permissions import IsAdminUser
from apps.organizations.permissions import IsSuperAdmin
from .models import AuditLog


class AuditSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', default='', read_only=True)
    organization_name = serializers.CharField(source='organization.name', default='', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'organization', 'organization_name', 'user', 'user_name', 'action', 'entity', 'entity_id', 'ip', 'meta', 'created_at']


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    serializer_class = AuditSerializer
    queryset = AuditLog.objects.select_related('user', 'organization')
    filterset_fields = ['organization', 'action']
    search_fields = ['entity', 'user__full_name', 'user__email']
