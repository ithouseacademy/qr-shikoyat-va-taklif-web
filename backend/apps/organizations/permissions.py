from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from .models import OrganizationMembership


def get_membership(request):
    """Joriy foydalanuvchining FAOL tashkilotdagi a'zoligi (tenant)."""
    if hasattr(request, '_membership'):
        return request._membership
    m = None
    u = getattr(request, 'user', None)
    if u is not None and u.is_authenticated:
        m = (OrganizationMembership.objects.select_related('organization', 'organization__settings')
             .filter(user=u, organization__status='active').first())
    request._membership = m
    return m


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class OrgRolePermission(BasePermission):
    """O'qish: har qanday a'zo. Yozish: view.write_roles."""
    message = 'Bu amal uchun ruxsat yo‘q'

    def has_permission(self, request, view):
        m = get_membership(request)
        if not m:
            return False
        if request.method in SAFE_METHODS:
            return True
        return m.role in getattr(view, 'write_roles', ('owner', 'admin'))


class ManagerPlus(BasePermission):
    def has_permission(self, request, view):
        m = get_membership(request)
        return bool(m and m.role in ('owner', 'admin', 'manager'))


class TenantMixin:
    """Barcha querysetlarni tashkilot bo'yicha ajratadi."""
    permission_classes = [IsAuthenticated, OrgRolePermission]
    write_roles = ('owner', 'admin')

    def org(self):
        return get_membership(self.request).organization

    def membership(self):
        return get_membership(self.request)

    def get_queryset(self):
        return super().get_queryset().filter(organization=self.org())

    def get_serializer_context(self):
        c = super().get_serializer_context()
        c['org'] = self.org()
        return c

    def perform_create(self, serializer):
        from apps.audit.services import audit_log
        obj = serializer.save(organization=self.org())
        audit_log(self.request, 'create', obj)

    def perform_update(self, serializer):
        from apps.audit.services import audit_log
        obj = serializer.save()
        audit_log(self.request, 'update', obj)

    def perform_destroy(self, instance):
        from apps.audit.services import audit_log
        audit_log(self.request, 'delete', instance)
        instance.delete()
