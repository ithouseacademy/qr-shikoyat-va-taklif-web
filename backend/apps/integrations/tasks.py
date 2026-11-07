import logging
import os
import requests
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

log = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mov', '.m4v', '.ogg'}


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


def _post_media(token, chat_id, file_path, method, field, caption=''):
    with open(file_path, 'rb') as fh:
        data = {'chat_id': chat_id}
        if caption:
            data['caption'] = caption[:1024]
        return requests.post(
            f'https://api.telegram.org/bot{token}/{method}',
            data=data, files={field: (os.path.basename(file_path), fh)}, timeout=60)


@shared_task(bind=True, max_retries=3)
def send_telegram_media(self, token, chat_id, file_path, caption=''):
    """Murojaatga biriktirilgan rasm/videoni Telegramga yuboradi.

    Rasm -> sendPhoto, video -> sendVideo. Agar Telegram formatni qabul qilmasa,
    fayl sendDocument orqali yuboriladi.
    """
    try:
        if not file_path or not os.path.exists(file_path):
            log.warning('Telegram media topilmadi: %s', file_path)
            return 0
        is_video = os.path.splitext(file_path)[1].lower() in VIDEO_EXTENSIONS
        method, field = ('sendVideo', 'video') if is_video else ('sendPhoto', 'photo')
        r = _post_media(token, chat_id, file_path, method, field, caption)
        if r.status_code >= 400:
            r = _post_media(token, chat_id, file_path, 'sendDocument', 'document', caption)
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
    if fb.name:
        lines.append(f'Mijoz: {fb.name}')
    if fb.from_person:
        lines.append(f'Kim tomondan: {fb.from_person}')
    if fb.to_person:
        lines.append(f'Kimga: {fb.to_person}')
    if fb.reason:
        lines.append(f'Sabab: {fb.reason}')
    if fb.rating:
        lines.append(f'Baho: {fb.rating}/5')
    if fb.text:
        lines.append(fb.text[:500])
    lines.append(f'{settings.FRONTEND_URL}/app/feedbacks/{fb.id}')
    text = '\n'.join(lines)
    tg = getattr(org, 'telegram', None)
    chat_ids = tg.recipient_ids() if tg else []
    if tg and tg.enabled and tg.bot_token and chat_ids:
        paths = []
        for att in fb.attachments.all():
            if not att.file:
                continue
            try:
                paths.append(att.file.path)
            except (NotImplementedError, ValueError):
                log.warning('Fayl lokal saqlanmagan, Telegramga yuborilmadi: %s', att.file.name)
        for chat_id in chat_ids:
            send_telegram.delay(tg.bot_token, chat_id, text)
            for path in paths:
                send_telegram_media.delay(tg.bot_token, chat_id, path, fb.number)
    em = getattr(org, 'email_integration', None)
    if em and em.enabled and em.recipients.strip():
        rec = [e.strip() for e in em.recipients.split(',') if e.strip()]
        try:
            send_mail(head, text, settings.DEFAULT_FROM_EMAIL, rec, fail_silently=True)
        except Exception:
            log.exception('Email yuborilmadi')
