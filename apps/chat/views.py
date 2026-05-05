from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.chat.models import CHAT_MESSAGE_VISIBILITY_CHOICES, ChatMessage, ChatThread
from apps.chat.realtime import (
    broadcast_chat_message,
    broadcast_read_receipt,
    broadcast_thread_update,
)
from apps.chat.serializers import ChatMessageSerializer, ChatThreadSerializer
from apps.chat.serializers import (
    ChatMarkReadResponseSerializer,
    ChatProposalActionRequestSerializer,
    ChatProposalDecisionResponseSerializer,
    ChatThreadStartRequestSerializer,
    ChatThreadStartResponseSerializer,
)
from apps.accounts.models import USER_TYPE_CHOICES
from apps.accounts.models import CustomUser
from apps.jobs.models import JobOrder
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal
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
    proposals_prefetch = Prefetch(
        'proposals',
        queryset=(
            VacancyProposal.objects
            .select_related('vacancy')
            .order_by('-created_at', '-id')
        ),
        to_attr='prefetched_proposals',
    )
    return (
        ChatThread.objects
        .select_related('vacancy', 'client', 'worker', 'worker__worker_profile')
        .prefetch_related(latest_messages_prefetch, proposals_prefetch)
        .filter(Q(client=user) | Q(worker=user))
    )


def _resolve_target_proposal(thread, proposal_id):
    queryset = thread.proposals.select_related('vacancy').order_by('-created_at', '-id')
    if proposal_id is not None:
        try:
            proposal_id = int(proposal_id)
        except (TypeError, ValueError):
            raise ValidationError({'proposal_id': "Murojaat identifikatori noto`g`ri."})
        proposal = queryset.filter(pk=proposal_id).first()
        if proposal is None:
            raise ValidationError({'proposal_id': "Tanlangan murojaat topilmadi."})
        return proposal

    pending = queryset.filter(status=PROPOSAL_STATUS_CHOICES.pending).first()
    if pending is None:
        raise ValidationError({'detail': "Ushbu suhbatda kutilayotgan murojaat topilmadi."})
    return pending


@extend_schema(tags=['Chat'], summary='Mening chat suhbatlarim ro`yxati')
class ChatThreadListView(generics.ListAPIView):
    serializer_class = ChatThreadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return _thread_queryset_for_user(self.request.user)


@extend_schema(tags=['Chat'], summary='Usta bilan to`g`ridan-to`g`ri chatni boshlash')
class ChatThreadStartView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatThreadStartRequestSerializer

    @extend_schema(
        tags=['Chat'],
        request=ChatThreadStartRequestSerializer,
        responses=ChatThreadStartResponseSerializer,
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        worker_id = serializer.validated_data['worker_id']
        vacancy_id = serializer.validated_data.get('vacancy_id')
        initial_message = (serializer.validated_data.get('initial_message') or '').strip()

        # Mijozlar uchun to'g'ridan-to'g'ri chat oqimi. Usta faqat mijoz bilan chat boshlashi mumkin.
        if request.user.user_type != USER_TYPE_CHOICES.client:
            raise PermissionDenied("Faqat mijoz usta bilan chat boshlashi mumkin.")

        worker = get_object_or_404(
            CustomUser.objects.filter(
                is_active=True,
                is_verified=True,
                user_type=USER_TYPE_CHOICES.worker,
            ),
            pk=worker_id,
        )
        if worker.id == request.user.id:
            raise ValidationError({'worker_id': "O'zingiz bilan chat boshlay olmaysiz."})

        vacancy = None
        if vacancy_id is not None:
            vacancy = get_object_or_404(
                JobOrder.objects.filter(client=request.user),
                pk=vacancy_id,
            )

        thread, created = ChatThread.objects.get_or_create(
            client=request.user,
            worker=worker,
            vacancy=vacancy,
        )
        if created and initial_message:
            message = ChatMessage.objects.create(
                thread=thread,
                sender=request.user,
                body=initial_message,
            )
            thread.save(update_fields=['updated_at'])
            broadcast_chat_message(thread.id, ChatMessageSerializer(message).data)

        return Response(
            {
                'detail': "Chat tayyor.",
                'thread_id': thread.id,
                'created': created,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=['Chat'], summary='Chat xabarlarini olish va yangi xabar yuborish')
class ChatMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = None

    def get_throttles(self):
        self.throttle_scope = 'chat_post_message' if self.request.method == 'POST' else None
        return super().get_throttles()

    def _get_thread(self):
        queryset = ChatThread.objects.select_related('vacancy', 'client', 'worker').filter(
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
class ChatMarkReadView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatProposalActionRequestSerializer

    @extend_schema(tags=['Chat'], request=None, responses=ChatMarkReadResponseSerializer)
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
class ChatAcceptWorkerView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatProposalActionRequestSerializer

    @extend_schema(
        tags=['Chat'],
        request=ChatProposalActionRequestSerializer,
        responses=ChatProposalDecisionResponseSerializer,
    )
    def post(self, request, thread_id, *args, **kwargs):
        queryset = ChatThread.objects.select_related('vacancy', 'client', 'worker')
        thread = get_object_or_404(
            queryset,
            pk=thread_id,
        )

        if thread.client_id != request.user.id:
            raise PermissionDenied("Faqat mijoz ustani qabul qila oladi.")

        proposal = accept_proposal(_resolve_target_proposal(thread, request.data.get('proposal_id')))
        if thread.vacancy_id != proposal.vacancy_id:
            thread.vacancy = proposal.vacancy
            thread.save(update_fields=['vacancy', 'updated_at'])
        system_message = ChatMessage.objects.create(
            thread=thread,
            sender=request.user,
            body=f"E`lon: {proposal.vacancy.title}\nMijoz sizni ushbu e`lon uchun qabul qildi.",
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
class ChatRejectWorkerView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatProposalActionRequestSerializer

    @extend_schema(
        tags=['Chat'],
        request=ChatProposalActionRequestSerializer,
        responses=ChatProposalDecisionResponseSerializer,
    )
    def post(self, request, thread_id, *args, **kwargs):
        queryset = ChatThread.objects.select_related('vacancy', 'client', 'worker')
        thread = get_object_or_404(
            queryset,
            pk=thread_id,
        )

        if thread.client_id != request.user.id:
            raise PermissionDenied("Faqat mijoz ustani rad qila oladi.")

        proposal = reject_proposal(_resolve_target_proposal(thread, request.data.get('proposal_id')))
        if thread.vacancy_id != proposal.vacancy_id:
            thread.vacancy = proposal.vacancy
            thread.save(update_fields=['vacancy', 'updated_at'])
        system_message = ChatMessage.objects.create(
            thread=thread,
            sender=request.user,
            body=f"E`lon: {proposal.vacancy.title}\nMijoz ushbu e`lon bo`yicha murojaatni rad etdi.",
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
