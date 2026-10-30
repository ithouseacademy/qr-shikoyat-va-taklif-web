import logging
import requests
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

log = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_telegram(self, token, chat_id, text):
    try:
        r = requests.post(f'https://api.telegram.org/bot{token}/sendMessage',
                          json={'chat_id': chat_id, 'text': text}, timeout=10)
        if r.status_code >= 500:
            raise RuntimeError(r.text)
        return r.status_code
    except Exception as e:
        raise self.retry(exc=e, countdown=30 * 2 ** self.request.retries)


@shared_task
def deliver_external(feedback_id):
    from apps.feedback.models import Feedback
    fb = Feedback.objects.select_related('organization', 'branch', 'department', 'category').filter(pk=feedback_id).first()
    if not fb:
        return
    org = fb.organization
    head = {'suggestion': 'Yangi taklif!', 'complaint': 'Yangi shikoyat!', 'rating': 'Yangi baho!'}[fb.type]
    where = ' — '.join(x for x in (org.name, fb.branch.name if fb.branch else '', fb.department.name if fb.department else '') if x)
    lines = [head, where, f'Raqam: {fb.number}']
    if fb.category:
        lines.append(f'Kategoriya: {fb.category.name}')
    if fb.rating:
        lines.append(f'Baho: {fb.rating}/5')
    if fb.text:
        lines.append(fb.text[:500])
    lines.append(f'{settings.FRONTEND_URL}/app/feedbacks/{fb.id}')
    text = '\n'.join(lines)
    tg = getattr(org, 'telegram', None)
    if tg and tg.enabled and tg.bot_token and tg.chat_id:
        send_telegram.delay(tg.bot_token, tg.chat_id, text)
    em = getattr(org, 'email_integration', None)
    if em and em.enabled and em.recipients.strip():
        rec = [e.strip() for e in em.recipients.split(',') if e.strip()]
        try:
            send_mail(head, text, settings.DEFAULT_FROM_EMAIL, rec, fail_silently=True)
        except Exception:
            log.exception('Email yuborilmadi')
