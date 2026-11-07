import re

from django.db import models


class TelegramIntegration(models.Model):
    organization = models.OneToOneField('organizations.Organization', on_delete=models.CASCADE, related_name='telegram')
    bot_token = models.CharField(max_length=200, blank=True)
    chat_id = models.CharField(max_length=60, blank=True)  # eski yagona chat ID (moslik uchun)
    chat_ids = models.TextField(blank=True, help_text='Cheksiz chat ID: vergul yoki yangi qator bilan')
    enabled = models.BooleanField(default=False)

    def recipient_ids(self):
        """Barcha chat ID'larni takrorlanmasdan qaytaradi."""
        result = []
        for value in (self.chat_ids, self.chat_id):
            for part in re.split(r'[\s,;]+', value or ''):
                part = part.strip()
                if part and part not in result:
                    result.append(part)
        return result


class EmailIntegration(models.Model):
    organization = models.OneToOneField('organizations.Organization', on_delete=models.CASCADE, related_name='email_integration')
    recipients = models.TextField(blank=True, help_text='Vergul bilan ajratilgan email manzillar')
    enabled = models.BooleanField(default=False)
