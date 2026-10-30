from rest_framework import serializers, viewsets
from apps.organizations.permissions import TenantMixin
from apps.organizations.serializers import TenantSerializer
from .models import Department


class DepartmentSerializer(TenantSerializer):
    tenant_fields = ('branch',)
    branch_name = serializers.CharField(source='branch.name', default='', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'branch', 'branch_name', 'created_at']


class DepartmentViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Department.objects.select_related('branch')
    serializer_class = DepartmentSerializer
    filterset_fields = ['branch']
    search_fields = ['name']
