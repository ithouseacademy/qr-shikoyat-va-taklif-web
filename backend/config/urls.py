from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from django.conf import settings
from .views import version

urlpatterns = [
    path('api/version/', version),
    path('django-admin/', admin.site.urls),
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.organizations.urls')),
    path('api/', include('apps.branches.urls')),
    path('api/', include('apps.departments.urls')),
    path('api/', include('apps.qr_codes.urls')),
    path('api/', include('apps.feedback.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/', include('apps.analytics.urls')),
    path('api/', include('apps.integrations.urls')),
    path('api/', include('apps.audit.urls')),
    # Productionda media'ni nginx orqali bering (docker-compose'dagi nginx shuni qiladi)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
