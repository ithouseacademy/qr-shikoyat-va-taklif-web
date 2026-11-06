import re
from django.db.models import Count
from django.http import HttpResponse
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.organizations.permissions import TenantMixin
from apps.organizations.serializers import TenantSerializer
from .models import QRCode
from .render import render_qr

HEX = re.compile(r'#[0-9a-fA-F]{6}')


class QRCodeSerializer(TenantSerializer):
    tenant_fields = ('branch', 'department')
    public_url = serializers.SerializerMethodField()
    scans_count = serializers.IntegerField(read_only=True)
    feedback_count = serializers.IntegerField(read_only=True)
    branch_name = serializers.CharField(source='branch.name', default='', read_only=True)
    department_name = serializers.CharField(source='department.name', default='', read_only=True)

    class Meta:
        model = QRCode
        fields = ['id', 'name', 'branch', 'branch_name', 'department', 'department_name', 'location', 'token', 'public_url',
                  'color', 'bg_color', 'use_logo', 'is_active', 'scans_count', 'feedback_count', 'created_at']
        read_only_fields = ['token']

    def get_public_url(self, obj):
        return obj.public_url_for(self.context.get('request'))

    def validate_color(self, v):
        if not HEX.fullmatch(v):
            raise serializers.ValidationError('#RRGGBB')
        return v

    validate_bg_color = validate_color


class QRCodeViewSet(TenantMixin, viewsets.ModelViewSet):
    write_roles = ('owner', 'admin', 'manager')
    queryset = QRCode.objects.select_related('branch', 'department', 'organization').annotate(
        scans_count=Count('scans', distinct=True), feedback_count=Count('feedbacks', distinct=True))
    serializer_class = QRCodeSerializer
    filterset_fields = ['branch', 'department', 'is_active']
    search_fields = ['name', 'location']

    @action(detail=True, methods=['get'])
    def image(self, request, pk=None):
        qr = self.get_object()
        fmt = 'pdf' if request.query_params.get('format') == 'pdf' else 'png'
        data, ctype = render_qr(qr, fmt, public_url=qr.public_url_for(request))
        resp = HttpResponse(data, content_type=ctype)
        if request.query_params.get('download'):
            resp['Content-Disposition'] = f'attachment; filename="qr-{qr.token}.{fmt}"'
        return resp

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        qr = self.get_object()
        qr.is_active = not qr.is_active
        qr.save(update_fields=['is_active'])
        return Response({'is_active': qr.is_active})
