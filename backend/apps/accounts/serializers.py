from django.contrib.auth import password_validation
from django.db import transaction
from rest_framework import serializers
from apps.organizations.services import create_organization
from .models import User, normalize_phone


def user_org_payload(user):
    from apps.organizations.models import OrganizationMembership
    m = (OrganizationMembership.objects.select_related('organization', 'organization__settings')
         .filter(user=user).first())
    if not m:
        return None, None
    o = m.organization
    s = o.settings
    return {'id': o.id, 'name': o.name, 'slug': o.slug, 'status': o.status,
            'logo': o.logo.url if o.logo else None, 'primary_color': s.primary_color}, m.role


class MeSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'full_name', 'is_superuser', 'organization', 'role']
        read_only_fields = ['id', 'is_superuser']

    def _cache(self, user):
        if not hasattr(user, '_org_cache'):
            user._org_cache = user_org_payload(user)
        return user._org_cache

    def get_organization(self, u): return self._cache(u)[0]
    def get_role(self, u): return 'super_admin' if u.is_superuser else self._cache(u)[1]

    def validate_phone(self, v):
        v = normalize_phone(v) or None
        if v and User.objects.exclude(pk=self.instance.pk if self.instance else None).filter(phone=v).exists():
            raise serializers.ValidationError('Bu telefon raqam band')
        return v

    def validate_email(self, v):
        v = v.lower()
        if User.objects.exclude(pk=self.instance.pk if self.instance else None).filter(email__iexact=v).exists():
            raise serializers.ValidationError('Bu email band')
        return v


class RegisterSerializer(serializers.Serializer):
    organization_name = serializers.CharField(max_length=150)
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, v):
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError('Bu email band')
        return v.lower()

    def validate_phone(self, v):
        v = normalize_phone(v)
        if len(v) < 9:
            raise serializers.ValidationError('Telefon raqam noto‘g‘ri')
        if User.objects.filter(phone=v).exists():
            raise serializers.ValidationError('Bu telefon raqam band')
        return v

    def validate_password(self, v):
        password_validation.validate_password(v)
        return v

    @transaction.atomic
    def create(self, d):
        user = User.objects.create_user(email=d['email'], password=d['password'], full_name=d['full_name'], phone=d['phone'])
        create_organization(d['organization_name'], user)
        return user
