from django.conf import settings
from django.db import models

ROLE_OWNER, ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE = 'owner', 'admin', 'manager', 'employee'
ROLES = [(ROLE_OWNER, 'Organization Owner'), (ROLE_ADMIN, 'Organization Admin'),
         (ROLE_MANAGER, 'Manager'), (ROLE_EMPLOYEE, 'Employee')]


class Organization(models.Model):
    STATUS = [('active', 'Faol'), ('blocked', 'Bloklangan'), ('inactive', 'Faol emas')]
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=60, unique=True)
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class OrganizationSettings(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='settings')
    primary_color = models.CharField(max_length=7, default='#2563EB')
    welcome_text = models.CharField(max_length=300, default='Xush kelibsiz! Fikringiz biz uchun muhim.')
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)
    address = models.CharField(max_length=250, blank=True)
    social_links = models.JSONField(default=list, blank=True)
    menu_links = models.JSONField(default=list, blank=True)
    # Super admin boshqaradi: mijoz sahifasidagi WEBSTORM IT footerini ko'rsatish.
    show_branding = models.BooleanField(default=True)
    # Mijoz formasidagi ixtiyoriy maydonlar (admin yoqadi/o'chiradi).
    collect_name = models.BooleanField(default=False)
    require_name = models.BooleanField(default=False)
    collect_complaint_context = models.BooleanField(default=False)
    require_complaint_context = models.BooleanField(default=False)
    collect_resolution = models.BooleanField(default=False)
    require_resolution = models.BooleanField(default=False)
    show_resolution = models.BooleanField(default=False)


class OrganizationMembership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=10, choices=ROLES, default=ROLE_EMPLOYEE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'organization')