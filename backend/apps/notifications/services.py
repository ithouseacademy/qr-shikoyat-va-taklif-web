import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.accounts.models import User
from .models import Notification, NotificationPreference

log = logging.getLogger(__name__)


def staff_users(org, roles=('owner', 'admin', 'manager')):
    return list(User.objects.filter(memberships__organization=org, memberships__role__in=roles, is_active=True).distinct())


def serialize(n):
    return {'id': n.id, 'type': n.type, 'title': n.title, 'body': n.body, 'feedback': n.feedback_id,
            'is_read': n.is_read, 'created_at': n.created_at.isoformat()}


def notify(org, ntype, title, body, users, feedback=None):
    """Ilova ichidagi bildirishnoma + WebSocket + (ruxsat bo'lsa) Web Push. Faqat o'z tashkilotiga."""
    from .tasks import deliver_push
    layer = get_channel_layer()
    for u in set(users):
        if not u.memberships.filter(organization=org).exists():
            continue  # tenant himoyasi
        n = Notification.objects.create(organization=org, user=u, type=ntype, title=title, body=body, feedback=feedback)
        try:
            async_to_sync(layer.group_send)(f'user_{u.id}', {'type': 'notify', 'data': serialize(n)})
        except Exception:
            log.exception('WS yuborilmadi')
        pref, _ = NotificationPreference.objects.get_or_create(user=u)
        if pref.push_enabled and getattr(pref, ntype, True):
            deliver_push.delay(n.id)
