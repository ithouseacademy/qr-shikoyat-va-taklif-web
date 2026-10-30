import json
import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import Notification, PushSubscription

log = logging.getLogger(__name__)


@shared_task
def deliver_push(notification_id):
    n = Notification.objects.select_related('feedback').filter(pk=notification_id).first()
    if not n or not settings.VAPID_PRIVATE_KEY:
        return
    payload = {'title': n.title, 'body': n.body, 'tag': f'n{n.id}',
               'url': f'/app/feedbacks/{n.feedback_id}' if n.feedback_id else '/app/notifications'}
    for sub in PushSubscription.objects.filter(user=n.user, organization=n.organization):
        send_push.delay(sub.id, payload)


@shared_task(bind=True, max_retries=3)
def send_push(self, sub_id, payload):
    from pywebpush import WebPushException, webpush
    sub = PushSubscription.objects.filter(pk=sub_id).first()
    if not sub:
        return
    try:
        webpush(subscription_info={'endpoint': sub.endpoint, 'keys': {'p256dh': sub.p256dh, 'auth': sub.auth}},
                data=json.dumps(payload), vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={'sub': settings.VAPID_CLAIMS_EMAIL}, ttl=3600)
        PushSubscription.objects.filter(pk=sub_id).update(failures=0, last_success_at=timezone.now())
    except WebPushException as e:
        code = getattr(getattr(e, 'response', None), 'status_code', None)
        if code in (404, 410):  # eskirgan subscription
            sub.delete()
            return
        PushSubscription.objects.filter(pk=sub_id).update(failures=sub.failures + 1)
        raise self.retry(exc=e, countdown=30 * 2 ** self.request.retries)


@shared_task
def cleanup_subscriptions():
    n, _ = PushSubscription.objects.filter(failures__gte=5).delete()
    return n
