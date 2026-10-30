from django.db.models import Count
from rest_framework import serializers, viewsets
from apps.organizations.permissions import TenantMixin
from apps.organizations.serializers import TenantSerializer
from .models import Branch


class BranchSerializer(TenantSerializer):
    feedback_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Branch
        fields = ['id', 'name', 'address', 'phone', 'is_active', 'feedback_count', 'created_at']


class BranchViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Branch.objects.annotate(feedback_count=Count('feedbacks'))
    serializer_class = BranchSerializer
    search_fields = ['name', 'address']
