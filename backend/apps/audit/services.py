def client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return (xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')) or None


def audit_log(request, action, obj=None, org=None, meta=None, entity=None, entity_id=None):
    from .models import AuditLog
    user = getattr(request, 'user', None)
    user = user if user is not None and user.is_authenticated else None
    if org is None and obj is not None:
        org = getattr(obj, 'organization', None)
    try:
        AuditLog.objects.create(
            organization=org, user=user, action=action,
            entity=entity or (obj.__class__.__name__ if obj is not None else ''),
            entity_id=str(entity_id or getattr(obj, 'pk', '') or ''),
            ip=client_ip(request), meta=meta or {})
    except Exception:  # audit hech qachon asosiy jarayonni to'xtatmasin
        pass
