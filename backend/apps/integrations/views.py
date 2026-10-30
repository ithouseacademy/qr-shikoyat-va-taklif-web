import requests
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.audit.services import audit_log
from apps.organizations.permissions import OrgRolePermission, get_membership
from .models import EmailIntegration, TelegramIntegration


class TelegramView(APIView):
    permission_classes = [IsAuthenticated, OrgRolePermission]

    def _obj(self, request):
        return TelegramIntegration.objects.get_or_create(organization=get_membership(request).organization)[0]

    def _out(self, o):  # bot_token hech qachon qaytarilmaydi
        return {'enabled': o.enabled, 'chat_id': o.chat_id, 'has_token': bool(o.bot_token)}

    def get(self, request):
        return Response(self._out(self._obj(request)))

    def put(self, request):
        o = self._obj(request)
        d = request.data
        if d.get('bot_token'):
            o.bot_token = str(d['bot_token']).strip()
        if 'chat_id' in d:
            o.chat_id = str(d['chat_id']).strip()
        if 'enabled' in d:
            o.enabled = bool(d['enabled'])
        o.save()
        audit_log(request, 'update', o, entity='TelegramIntegration')
        return Response(self._out(o))

    def post(self, request):  # test xabar
        o = self._obj(request)
        if not (o.bot_token and o.chat_id):
            return Response({'detail': 'Bot token va chat ID kiriting'}, status=400)
        try:
            r = requests.post(f'https://api.telegram.org/bot{o.bot_token}/sendMessage',
                              json={'chat_id': o.chat_id, 'text': '✅ QR Feedback: test xabar'}, timeout=10)
        except Exception:
            return Response({'detail': 'Telegramga ulanib bo‘lmadi'}, status=502)
        return Response({'ok': r.ok, 'detail': 'Yuborildi' if r.ok else 'Telegram xatosi: token yoki chat ID noto‘g‘ri'}, status=200 if r.ok else 400)


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
