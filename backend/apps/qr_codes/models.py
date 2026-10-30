import secrets
from django.conf import settings
from django.db import models


def new_token():
    return secrets.token_urlsafe(9)  # ~72 bit, taxmin qilib bo'lmaydi


class QRCode(models.Model):
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='qr_codes')
    branch = models.ForeignKey('branches.Branch', null=True, blank=True, on_delete=models.SET_NULL, related_name='qr_codes')
    department = models.ForeignKey('departments.Department', null=True, blank=True, on_delete=models.SET_NULL, related_name='qr_codes')
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=150, blank=True)
    token = models.CharField(max_length=32, unique=True, default=new_token, editable=False)
    color = models.CharField(max_length=7, default='#0F172A')
    bg_color = models.CharField(max_length=7, default='#FFFFFF')
    use_logo = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def public_url(self):
        return f"{settings.FRONTEND_URL}/{self.organization.slug}/qr/{self.token}"


class QRScan(models.Model):
    qr = models.ForeignKey(QRCode, on_delete=models.CASCADE, related_name='scans')
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='qr_scans')
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
