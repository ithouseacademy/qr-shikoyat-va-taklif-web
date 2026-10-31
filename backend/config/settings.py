import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

# .env faylini o'qish (qo'shimcha kutubxonasiz)
_env_file = BASE_DIR / '.env'
if _env_file.exists():
    for _line in _env_file.read_text(encoding='utf-8').splitlines():
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _k, _v = _line.split('=', 1)
            os.environ.setdefault(_k.strip(), _v.strip())


def env(key, default=None):
    return os.environ.get(key, default)


def env_list(key, default=''):
    return [x.strip() for x in env(key, default).split(',') if x.strip()]


SECRET_KEY = env('SECRET_KEY', 'dev-insecure-change-me')
APP_VERSION = env('APP_VERSION', '1.1.0')
DEBUG = env('DEBUG', '1') == '1'
FRONTEND_URL = env('FRONTEND_URL', 'https://qrfeedback.webstorm.uz').rstrip('/')
BACKEND_URL = env('BACKEND_URL', 'https://qrfeedbackbackend.webstorm.uz').rstrip('/')
_HOSTS_DEFAULT = (
    'localhost,127.0.0.1,qrfeedback.webstorm.uz,qrfeedbackbackend.webstorm.uz,'
    '.up.railway.app,.railway.app'
)
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', _HOSTS_DEFAULT)

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes',
    'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles',
    'rest_framework', 'corsheaders', 'django_filters', 'channels',
    'apps.accounts', 'apps.organizations', 'apps.branches', 'apps.departments',
    'apps.qr_codes', 'apps.feedback', 'apps.notifications', 'apps.analytics',
    'apps.integrations', 'apps.audit',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug', 'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth', 'django.contrib.messages.context_processors.messages']},
}]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

def _postgres_from_url(url):
    """Railway/Heroku uslubidagi DATABASE_URL ni Django sozlamasiga aylantiradi."""
    u = urlparse(url)
    if u.scheme not in ('postgres', 'postgresql'):
        return None
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': (u.path or '/railway').lstrip('/') or 'railway',
        'USER': unquote(u.username or ''),
        'PASSWORD': unquote(u.password or ''),
        'HOST': u.hostname or '',
        'PORT': str(u.port or 5432),
        'CONN_MAX_AGE': 60,
    }


# Railway PostgreSQL ulanishi DATABASE_URL orqali avtomatik beriladi.
# Lokal sinash: SQLite (standart). Serverda USE_SQLITE=0 yoki DATABASE_URL bilan PostgreSQL.
DATABASE_URL = env('DATABASE_URL', '')
_db_from_url = _postgres_from_url(DATABASE_URL) if DATABASE_URL else None
if _db_from_url:
    DATABASES = {'default': _db_from_url}
elif env('USE_SQLITE', '1') == '1':
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
else:
    DATABASES = {'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB', 'railway'), 'USER': env('POSTGRES_USER', 'postgres'),
        'PASSWORD': env('POSTGRES_PASSWORD', ''), 'HOST': env('POSTGRES_HOST', 'localhost'),
        'PORT': env('POSTGRES_PORT', '5432'), 'CONN_MAX_AGE': 60,
    }}

AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
]
LANGUAGE_CODE = 'uz'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}
MEDIA_URL = '/media/'
# Railway'da volume ulanganda MEDIA_ROOT=/app/media (yoki boshqa yo'l) beriladi.
MEDIA_ROOT = Path(env('MEDIA_ROOT', str(BASE_DIR / 'media')))
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend',
                                'rest_framework.filters.SearchFilter', 'rest_framework.filters.OrderingFilter'],
    'DEFAULT_PAGINATION_CLASS': 'config.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.AnonRateThrottle', 'rest_framework.throttling.UserRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {'anon': '600/hour', 'user': '5000/hour', 'login': '20/min',
                               'public_submit': '20/hour', 'public_read': '300/hour', 'password_reset': '10/hour'},
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'] + (
        ['rest_framework.renderers.BrowsableAPIRenderer'] if DEBUG else []),
}
SIMPLE_JWT = {'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30), 'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
              'ROTATE_REFRESH_TOKENS': True}

CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', FRONTEND_URL)
CORS_ALLOWED_ORIGIN_REGEXES = [r'^https://[\w-]+\.up\.railway\.app$']
CORS_ALLOW_HEADERS = ['accept', 'authorization', 'content-type', 'idempotency-key', 'x-requested-with']
CSRF_TRUSTED_ORIGINS = env_list(
    'CSRF_TRUSTED_ORIGINS',
    f'{FRONTEND_URL},{BACKEND_URL},https://*.up.railway.app,https://*.railway.app',
)

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = env('HTTPS', '1') == '1'
    SECURE_SSL_REDIRECT = env('SSL_REDIRECT', '0') == '1'
    SECURE_HSTS_SECONDS = 31536000 if SECURE_SSL_REDIRECT else 0
    SECURE_CONTENT_TYPE_NOSNIFF = True

REDIS_URL = env('REDIS_URL', '')
if REDIS_URL:
    CHANNEL_LAYERS = {'default': {'BACKEND': 'channels_redis.core.RedisChannelLayer', 'CONFIG': {'hosts': [REDIS_URL]}}}
    CELERY_BROKER_URL = REDIS_URL
else:
    CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
    CELERY_BROKER_URL = 'memory://'
CELERY_TASK_ALWAYS_EAGER = env('CELERY_EAGER', '0' if REDIS_URL else '1') == '1'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    'cleanup-push-subscriptions': {'task': 'apps.notifications.tasks.cleanup_subscriptions', 'schedule': 60 * 60 * 24},
}

VAPID_PUBLIC_KEY = env('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = env('VAPID_PRIVATE_KEY', '')   # faqat backendda
VAPID_CLAIMS_EMAIL = env('VAPID_CLAIMS_EMAIL', 'mailto:admin@feedback.uz')

EMAIL_BACKEND = env('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', '')
EMAIL_PORT = int(env('EMAIL_PORT', '587'))
EMAIL_HOST_USER = env('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env('EMAIL_USE_TLS', '1') == '1'
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', 'noreply@feedback.uz')

LOGGING = {'version': 1, 'disable_existing_loggers': False,
           'handlers': {'console': {'class': 'logging.StreamHandler'}},
           'root': {'handlers': ['console'], 'level': 'INFO'}}