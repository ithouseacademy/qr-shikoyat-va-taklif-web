import secrets
from django.conf import settings
from django.db import models

NUM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def new_number():
    return 'FB-' + ''.join(secrets.choice(NUM_ALPHABET) for _ in range(8))


class FeedbackCategory(models.Model):
    KINDS = [('suggestion', 'Taklif'), ('complaint', 'Shikoyat'), ('both', 'Ikkalasi')]
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=10, choices=KINDS, default='both')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']


class Feedback(models.Model):
    TYPES = [('suggestion', 'Taklif'), ('complaint', 'Shikoyat'), ('rating', 'Baho')]
    STATUSES = [('new', 'Yangi'), ('in_progress', 'Ko‘rib chiqilmoqda'), ('answered', 'Javob berildi'),
                ('resolved', 'Hal qilindi'), ('rejected', 'Rad etildi')]
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='feedbacks')
    qr = models.ForeignKey('qr_codes.QRCode', null=True, blank=True, on_delete=models.SET_NULL, related_name='feedbacks')
    branch = models.ForeignKey('branches.Branch', null=True, blank=True, on_delete=models.SET_NULL, related_name='feedbacks')
    department = models.ForeignKey('departments.Department', null=True, blank=True, on_delete=models.SET_NULL, related_name='feedbacks')
    type = models.CharField(max_length=12, choices=TYPES)
    category = models.ForeignKey(FeedbackCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='feedbacks')
    name = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    text = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=STATUSES, default='new')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_feedbacks')
    number = models.CharField(max_length=14, unique=True, default=new_number)
    idempotency_key = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['organization', 'status']), models.Index(fields=['organization', 'created_at'])]
        constraints = [models.UniqueConstraint(fields=['organization', 'idempotency_key'], name='uniq_org_idempotency')]


def attachment_path(instance, filename):
    return f'feedback/{instance.feedback.organization_id}/{filename}'


class FeedbackAttachment(models.Model):
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to=attachment_path)
    created_at = models.DateTimeField(auto_now_add=True)


class FeedbackComment(models.Model):
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    text = models.TextField()
    is_internal = models.BooleanField(default=True)  # False => mijozga ko'rinadigan javob
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class FeedbackStatusHistory(models.Model):
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    from_status = models.CharField(max_length=12, blank=True)
    to_status = models.CharField(max_length=12)
    note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
