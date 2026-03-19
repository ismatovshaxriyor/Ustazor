from django.utils import timezone
from django.db import models
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.chat.models import CHAT_MESSAGE_VISIBILITY_CHOICES, ChatMessage, ChatThread
from apps.chat.presence import mark_user_connected, mark_user_disconnected
from apps.chat.realtime import (
    thread_group_name,
)
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

        is_online, last_seen_at = await self._mark_connected(user.id)
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat.presence_update',
                'data': {
                    'user_id': user.id,
                    'is_online': is_online,
                    'last_seen_at': last_seen_at,
                },
            },
        )

    async def disconnect(self, close_code):
        group_name = getattr(self, 'group_name', None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

        user = self.scope.get('user')
        thread_id = getattr(self, 'thread_id', None)
        if user and user.is_authenticated and thread_id is not None:
            is_online, last_seen_at = await self._mark_disconnected(user.id)
            target_group = group_name or thread_group_name(thread_id)
            await self.channel_layer.group_send(
                target_group,
                {
                    'type': 'chat.presence_update',
                    'data': {
                        'user_id': user.id,
                        'is_online': is_online,
                        'last_seen_at': last_seen_at,
                    },
                },
            )

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

        sender_id = message.get('sender_id')
        if sender_id and sender_id != self.scope['user'].id:
            changed, at = await self._mark_delivered(message['id'], self.participant_role)
            if changed:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat.delivery_receipt',
                        'data': {
                            'message_id': message['id'],
                            'by_user_id': self.scope['user'].id,
                            'at': at,
                        },
                    },
                )

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

    async def chat_delivery_receipt(self, event):
        await self.send_json(
            {
                'type': 'delivery_receipt',
                'data': event['data'],
            }
        )

    async def chat_read_receipt(self, event):
        await self.send_json(
            {
                'type': 'read_receipt',
                'data': event['data'],
            }
        )

    async def chat_presence_update(self, event):
        await self.send_json(
            {
                'type': 'presence_update',
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

    @database_sync_to_async
    def _mark_connected(self, user_id: int) -> tuple[bool, str]:
        return mark_user_connected(user_id)

    @database_sync_to_async
    def _mark_disconnected(self, user_id: int) -> tuple[bool, str]:
        return mark_user_disconnected(user_id)

    @database_sync_to_async
    def _mark_delivered(self, message_id: int, participant_role: str) -> tuple[bool, str]:
        now = timezone.now()
        queryset = ChatMessage.objects.filter(id=message_id)
        if participant_role == 'client':
            updated = queryset.filter(delivered_to_client_at__isnull=True).update(delivered_to_client_at=now)
        else:
            updated = queryset.filter(delivered_to_worker_at__isnull=True).update(delivered_to_worker_at=now)
        return bool(updated), now.isoformat()
