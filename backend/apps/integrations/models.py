from django.db import models


class TelegramIntegration(models.Model):
    organization = models.OneToOneField('organizations.Organization', on_delete=models.CASCADE, related_name='telegram')
    bot_token = models.CharField(max_length=200, blank=True)
    chat_id = models.CharField(max_length=60, blank=True)
    enabled = models.BooleanField(default=False)


class EmailIntegration(models.Model):
    organization = models.OneToOneField('organizations.Organization', on_delete=models.CASCADE, related_name='email_integration')
    recipients = models.TextField(blank=True, help_text='Vergul bilan ajratilgan email manzillar')
    enabled = models.BooleanField(default=False)
