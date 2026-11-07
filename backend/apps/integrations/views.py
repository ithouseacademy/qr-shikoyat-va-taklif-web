import re

import requests
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.audit.services import audit_log
from apps.organizations.permissions import OrgRolePermission, get_membership
from .models import EmailIntegration, TelegramIntegration


def split_chat_ids(value):
    if isinstance(value, (list, tuple)):
        parts = [str(v) for v in value]
    else:
        parts = re.split(r'[\s,;]+', str(value or ''))
    result = []
    for part in parts:
        part = part.strip()
        if part and part not in result:
            result.append(part)
    return result


class TelegramView(APIView):
    permission_classes = [IsAuthenticated, OrgRolePermission]

    def _obj(self, request):
        return TelegramIntegration.objects.get_or_create(organization=get_membership(request).organization)[0]

    def _out(self, o):  # bot_token hech qachon qaytarilmaydi
        return {'enabled': o.enabled, 'chat_ids': o.recipient_ids(), 'has_token': bool(o.bot_token)}

    def get(self, request):
        return Response(self._out(self._obj(request)))

    def put(self, request):
        o = self._obj(request)
        d = request.data
        if d.get('bot_token'):
            o.bot_token = str(d['bot_token']).strip()
        if 'chat_ids' in d or 'chat_id' in d:  # chat_id — eski moslik uchun
            ids = split_chat_ids(d.get('chat_ids', d.get('chat_id')))
            o.chat_ids = '\n'.join(ids)
            o.chat_id = ''
        if 'enabled' in d:
            o.enabled = bool(d['enabled'])
        o.save()
        audit_log(request, 'update', o, entity='TelegramIntegration')
        return Response(self._out(o))

    def post(self, request):  # test xabar — barcha chat ID'larga
        o = self._obj(request)
        ids = o.recipient_ids()
        if not (o.bot_token and ids):
            return Response({'detail': 'Bot token va kamida bitta chat ID kiriting'}, status=400)
        results = {}
        for chat_id in ids:
            try:
                r = requests.post(f'https://api.telegram.org/bot{o.bot_token}/sendMessage',
                                  json={'chat_id': chat_id, 'text': '✅ QR Feedback: test xabar'}, timeout=10)
                results[chat_id] = r.ok
            except Exception:
                results[chat_id] = False
        ok = bool(results) and all(results.values())
        sent = sum(1 for v in results.values() if v)
        return Response({
            'ok': ok, 'results': results,
            'detail': f'{sent}/{len(results)} chat ID ga yuborildi' if ok else 'Ba’zi chat ID’larga yuborilmadi: token yoki chat ID noto‘g‘ri',
        }, status=200 if ok else 400)


class EmailView(APIView):
    permission_classes = [IsAuthenticated, OrgRolePermission]

    def _obj(self, request):
        return EmailIntegration.objects.get_or_create(organization=get_membership(request).organization)[0]

    def get(self, request):
        o = self._obj(request)
        return Response({'enabled': o.enabled, 'recipients': o.recipients})

    def put(self, request):
        o = self._obj(request)
        if 'recipients' in request.data:
            o.recipients = str(request.data['recipients'])[:500]
        if 'enabled' in request.data:
            o.enabled = bool(request.data['enabled'])
        o.save()
        audit_log(request, 'update', o, entity='EmailIntegration')
        return Response({'enabled': o.enabled, 'recipients': o.recipients})
