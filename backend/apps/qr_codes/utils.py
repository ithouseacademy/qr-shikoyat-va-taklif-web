from urllib.parse import urlsplit

from django.conf import settings


def frontend_base_url(request=None):
    """QR havolalari uchun frontend domenini aniqlaydi.

    Admin qaysi domen orqali kirgan bo'lsa (Origin yoki Referer), QR havolasi
    ham o'sha domenga quriladi. Aks holda FRONTEND_URL ishlatiladi.
    """
    default = settings.FRONTEND_URL.rstrip('/')
    if request is None:
        return default
    origin = request.headers.get('Origin') or request.headers.get('Referer') or ''
    parts = urlsplit(origin)
    if not parts.scheme or not parts.netloc:
        return default
    origin = f'{parts.scheme}://{parts.netloc}'
    allowed = {url.rstrip('/').lower() for url in settings.FRONTEND_URLS}
    return origin if origin.lower() in allowed else default
