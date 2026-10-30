from django.conf import settings
from django.db import models

TYPES = [('new_suggestion', 'Yangi taklif'), ('new_complaint', 'Yangi shikoyat'), ('new_rating', 'Yangi baho'),
         ('assigned', 'Murojaat biriktirildi'), ('reply', 'Yangi javob'), ('status_changed', 'Holat o‘zgardi'), ('system', 'Tizim xabari')]


class Notification(models.Model):
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='notifications')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPES)
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=300, blank=True)
    feedback = models.ForeignKey('feedback.Feedback', null=True, blank=True, on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'is_read'])]


class PushSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_subscriptions')
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE)
    endpoint = models.TextField(unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    user_agent = models.CharField(max_length=300, blank=True)
    failures = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_success_at = models.DateTimeField(null=True, blank=True)


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_pref')
    push_enabled = models.BooleanField(default=True)
    new_suggestion = models.BooleanField(default=True)
    new_complaint = models.BooleanField(default=True)
    new_rating = models.BooleanField(default=True)
    assigned = models.BooleanField(default=True)
    reply = models.BooleanField(default=True)
    status_changed = models.BooleanField(default=True)
    system = models.BooleanField(default=True)
