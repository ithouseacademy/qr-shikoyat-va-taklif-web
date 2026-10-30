from django.conf import settings
from django.http import JsonResponse


def version(_request):
    return JsonResponse({
        'name': 'QR Feedback Platform',
        'owner': 'WEBSTORM IT',
        'version': settings.APP_VERSION,
    })
