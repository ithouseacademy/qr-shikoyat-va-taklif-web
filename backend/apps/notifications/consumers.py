from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


@database_sync_to_async
def user_from_token(token):
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import AccessToken
    try:
        uid = AccessToken(token)['user_id']
        return get_user_model().objects.get(pk=uid, is_active=True)
    except Exception:
        return None


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        token = parse_qs(self.scope['query_string'].decode()).get('token', [''])[0]
        user = await user_from_token(token)
        if not user:
            await self.close(code=4401)
            return
        self.group = f'user_{user.id}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def notify(self, event):
        await self.send_json(event['data'])
