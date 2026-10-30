from django.core.validators import URLValidator
from rest_framework import serializers
from apps.accounts.models import User, normalize_phone
from .models import Organization, OrganizationMembership, OrganizationSettings

SOCIAL_PLATFORMS = ('instagram', 'telegram', 'facebook', 'youtube', 'linkedin', 'twitter', 'website')


class TenantSerializer(serializers.ModelSerializer):
    """FK maydonlar boshqa tashkilotga tegishli bo'lib qolishining oldini oladi."""
    tenant_fields = ()

    def validate(self, attrs):
        org = self.context.get('org')
        for f in self.tenant_fields:
            obj = attrs.get(f)
            if obj is not None and org is not None and obj.organization_id != org.id:
                raise serializers.ValidationError({f: 'Noto‘g‘ri tanlov'})
        return attrs


class OrgSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = ['primary_color', 'welcome_text', 'contact_phone', 'contact_email', 'address', 'social_links']

    def validate_primary_color(self, v):
        import re
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', v):
            raise serializers.ValidationError('Rang #RRGGBB formatida bo‘lsin')
        return v

    def validate_social_links(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Ro‘yxat bo‘lishi kerak')
        if len(value) > 20:
            raise serializers.ValidationError('Ko‘pi bilan 20 ta havola')
        url_ok = URLValidator(schemes=['http', 'https'])
        cleaned = []
        for i, item in enumerate(value, 1):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f'{i}-qator noto‘g‘ri')
            platform = str(item.get('platform', 'website')).strip().lower()
            name = str(item.get('name', '')).strip()[:40]
            url = str(item.get('url', '')).strip()[:500]
            if platform not in SOCIAL_PLATFORMS:
                platform = 'website'
            if not url:
                continue
            try:
                url_ok(url)
            except Exception:
                raise serializers.ValidationError(f'{i}-havola manzili noto‘g‘ri (http:// yoki https:// bilan boshlansin)')
            cleaned.append({'platform': platform, 'name': name or platform.title(), 'url': url})
        return cleaned


class OrganizationSerializer(serializers.ModelSerializer):
    settings = OrgSettingsSerializer()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'logo', 'status', 'settings', 'created_at']
        read_only_fields = ['id', 'slug', 'status', 'created_at']

    def update(self, instance, validated):
        s = validated.pop('settings', None)
        for k, v in validated.items():
            setattr(instance, k, v)
        instance.save()
        if s:
            for k, v in s.items():
                setattr(instance.settings, k, v)
            instance.settings.save()
        return instance


class MembershipSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ['id', 'user_id', 'email', 'phone', 'full_name', 'role', 'created_at']


class StaffCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=['admin', 'manager', 'employee'])

    def validate_email(self, v):
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError('Bu email band')
        return v.lower()

    def validate_phone(self, v):
        v = normalize_phone(v)
        if v and User.objects.filter(phone=v).exists():
            raise serializers.ValidationError('Bu telefon band')
        return v or None
