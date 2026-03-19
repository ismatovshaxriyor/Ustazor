from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.models import CHAT_MESSAGE_VISIBILITY_CHOICES, ChatMessage, ChatThread
from apps.chat.realtime import (
    broadcast_chat_message,
    broadcast_read_receipt,
    broadcast_thread_update,
)
from apps.chat.serializers import ChatMessageSerializer, ChatThreadSerializer
from apps.proposals.services import accept_proposal, reject_proposal


def _thread_queryset_for_user(user):
    latest_messages_prefetch = Prefetch(
        'messages',
        queryset=(
            ChatMessage.objects
            .select_related('sender')
            .filter(ChatMessage.visibility_filter_for_user(user))
            .order_by('-created_at', '-id')
        ),
        to_attr='prefetched_messages',
    )
    return (
        ChatThread.objects
        .select_related('proposal', 'vacancy', 'client', 'worker')
        .prefetch_related(latest_messages_prefetch)
        .filter(Q(client=user) | Q(worker=user))
    )


@extend_schema(tags=['Chat'], summary='Mening chat suhbatlarim ro`yxati')
class ChatThreadListView(generics.ListAPIView):
    serializer_class = ChatThreadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return _thread_queryset_for_user(self.request.user)


@extend_schema(tags=['Chat'], summary='Chat xabarlarini olish va yangi xabar yuborish')
class ChatMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_thread(self):
        queryset = ChatThread.objects.select_related('proposal', 'vacancy', 'client', 'worker').filter(
            Q(client=self.request.user) | Q(worker=self.request.user),
        )
        return get_object_or_404(
            queryset,
            pk=self.kwargs['thread_id'],
        )

    def get_queryset(self):
        thread = self._get_thread()
        return (
            ChatMessage.objects
            .filter(thread=thread)
            .filter(ChatMessage.visibility_filter_for_user(self.request.user))
            .select_related('sender')
            .order_by('-created_at', '-id')
        )

    def perform_create(self, serializer):
        thread = self._get_thread()
        message = serializer.save(thread=thread, sender=self.request.user)
        thread.save(update_fields=['updated_at'])
        broadcast_chat_message(thread.id, ChatMessageSerializer(message).data)


@extend_schema(tags=['Chat'], summary='Aktiv suhbatdagi xabarlarni o`qilgan deb belgilash')
class ChatMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Chat'])
    def post(self, request, thread_id, *args, **kwargs):
        thread = get_object_or_404(
            ChatThread.objects.select_related('client', 'worker'),
            pk=thread_id,
        )
        if request.user.id not in {thread.client_id, thread.worker_id}:
            raise PermissionDenied("Bu suhbat sizga tegishli emas.")

        now = timezone.now()
        if request.user.id == thread.client_id:
            unseen = (
                ChatMessage.objects
                .filter(thread=thread, read_by_client_at__isnull=True)
                .exclude(sender_id=request.user.id)
                .filter(ChatMessage.visibility_filter_for_user(request.user))
            )
            unseen.update(
                delivered_to_client_at=now,
                read_by_client_at=now,
            )
        else:
            unseen = (
                ChatMessage.objects
                .filter(thread=thread, read_by_worker_at__isnull=True)
                .exclude(sender_id=request.user.id)
                .filter(ChatMessage.visibility_filter_for_user(request.user))
            )
            unseen.update(
                delivered_to_worker_at=now,
                read_by_worker_at=now,
            )

        last_read_message = (
            ChatMessage.objects
            .filter(thread=thread)
            .exclude(sender_id=request.user.id)
            .filter(ChatMessage.visibility_filter_for_user(request.user))
            .order_by('-id')
            .first()
        )

        if last_read_message is not None:
            broadcast_read_receipt(
                thread.id,
                {
                    'message_id': last_read_message.id,
                    'by_user_id': request.user.id,
                    'at': now.isoformat(),
                },
            )

        return Response(
            {
                'detail': "Xabarlar o`qilgan deb belgilandi.",
                'thread_id': thread.id,
                'last_read_message_id': getattr(last_read_message, 'id', None),
                'at': now.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=['Chat'], summary='Mijoz chat ichidan ustani qabul qiladi')
class ChatAcceptWorkerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Chat'])
    def post(self, request, thread_id, *args, **kwargs):
        queryset = ChatThread.objects.select_related('proposal', 'vacancy', 'client', 'worker')
        thread = get_object_or_404(
            queryset,
            pk=thread_id,
        )

        if thread.client_id != request.user.id:
            raise PermissionDenied("Faqat mijoz ustani qabul qila oladi.")

        proposal = accept_proposal(thread.proposal)
        system_message = ChatMessage.objects.create(
            thread=thread,
            sender=request.user,
            body="Mijoz sizni ushbu e`lon uchun qabul qildi.",
            is_system=True,
            visibility=CHAT_MESSAGE_VISIBILITY_CHOICES.worker_only,
        )
        thread.save(update_fields=['updated_at'])
        broadcast_chat_message(thread.id, ChatMessageSerializer(system_message).data)
        broadcast_thread_update(
            thread.id,
            {
                'proposal_status': proposal.status,
                'vacancy_status': proposal.vacancy.status,
                'assigned_worker_id': proposal.vacancy.assigned_worker_id,
            },
        )

        return Response(
            {
                'detail': 'Usta muvaffaqiyatli qabul qilindi.',
                'proposal_id': proposal.id,
                'proposal_status': proposal.status,
                'vacancy_id': proposal.vacancy_id,
                'vacancy_status': proposal.vacancy.status,
                'assigned_worker_id': proposal.vacancy.assigned_worker_id,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=['Chat'], summary='Mijoz chat ichidan ustani rad qiladi')
class ChatRejectWorkerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Chat'])
    def post(self, request, thread_id, *args, **kwargs):
        queryset = ChatThread.objects.select_related('proposal', 'vacancy', 'client', 'worker')
        thread = get_object_or_404(
            queryset,
            pk=thread_id,
        )

        if thread.client_id != request.user.id:
            raise PermissionDenied("Faqat mijoz ustani rad qila oladi.")

        proposal = reject_proposal(thread.proposal)
        system_message = ChatMessage.objects.create(
            thread=thread,
            sender=request.user,
            body="Mijoz ushbu e`lon bo`yicha murojaatni rad etdi.",
            is_system=True,
        )
        thread.save(update_fields=['updated_at'])
        broadcast_chat_message(thread.id, ChatMessageSerializer(system_message).data)
        broadcast_thread_update(
            thread.id,
            {
                'proposal_status': proposal.status,
                'vacancy_status': proposal.vacancy.status,
                'assigned_worker_id': proposal.vacancy.assigned_worker_id,
            },
        )

        return Response(
            {
                'detail': 'Usta murojaati rad etildi.',
                'proposal_id': proposal.id,
                'proposal_status': proposal.status,
                'vacancy_id': proposal.vacancy_id,
                'vacancy_status': proposal.vacancy.status,
            },
            status=status.HTTP_200_OK,
        )
