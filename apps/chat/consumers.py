from django.db import models
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.chat.models import CHAT_MESSAGE_VISIBILITY_CHOICES, ChatMessage, ChatThread
from apps.chat.realtime import thread_group_name
from apps.chat.serializers import ChatMessageSerializer


class ChatThreadConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.thread_id = int(self.scope['url_route']['kwargs']['thread_id'])
        can_join = await self._is_participant(self.thread_id, user.id)
        if not can_join:
            await self.close(code=4003)
            return
        self.participant_role = await self._participant_role(self.thread_id, user.id)
        if self.participant_role is None:
            await self.close(code=4003)
            return

        self.group_name = thread_group_name(self.thread_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        group_name = getattr(self, 'group_name', None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get('type')
        if msg_type != 'message':
            return

        body = (content.get('body') or '').strip()
        if not body:
            return

        message_data = await self._create_message(self.thread_id, self.scope['user'].id, body)
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat.message',
                'message': message_data,
            },
        )

    async def chat_message(self, event):
        message = event['message']
        visibility = message.get('visibility', CHAT_MESSAGE_VISIBILITY_CHOICES.all)
        if visibility == CHAT_MESSAGE_VISIBILITY_CHOICES.worker_only and self.participant_role != 'worker':
            return
        if visibility == CHAT_MESSAGE_VISIBILITY_CHOICES.client_only and self.participant_role != 'client':
            return

        await self.send_json(
            {
                'type': 'message',
                'message': message,
            }
        )

    async def chat_thread_update(self, event):
        await self.send_json(
            {
                'type': 'thread_update',
                'data': event['data'],
            }
        )

    @database_sync_to_async
    def _is_participant(self, thread_id: int, user_id: int) -> bool:
        return ChatThread.objects.filter(id=thread_id).filter(
            models.Q(client_id=user_id) | models.Q(worker_id=user_id)
        ).exists()

    @database_sync_to_async
    def _participant_role(self, thread_id: int, user_id: int):
        thread = ChatThread.objects.filter(id=thread_id).only('client_id', 'worker_id').first()
        if thread is None:
            return None
        if thread.client_id == user_id:
            return 'client'
        if thread.worker_id == user_id:
            return 'worker'
        return None

    @database_sync_to_async
    def _create_message(self, thread_id: int, sender_id: int, body: str) -> dict:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        thread = ChatThread.objects.select_related('client', 'worker').get(id=thread_id)
        sender = User.objects.get(id=sender_id)
        message = ChatMessage.objects.create(thread=thread, sender=sender, body=body)
        thread.save(update_fields=['updated_at'])
        return ChatMessageSerializer(message).data
