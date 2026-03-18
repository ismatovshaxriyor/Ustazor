from drf_spectacular.utils import extend_schema
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.chat.models import CHAT_MESSAGE_VISIBILITY_CHOICES, ChatMessage
from apps.chat.realtime import broadcast_chat_message, broadcast_thread_update
from apps.chat.serializers import ChatMessageSerializer
from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal
from apps.proposals.services import accept_proposal, reject_proposal
from apps.proposals.serializers import (
    ProposalStatusUpdateSerializer,
    VacancyProposalCreateSerializer,
    VacancyProposalSerializer,
)


@extend_schema(tags=['Proposals'], summary='Usta tomonidan e`longa murojaat yuborish')
class VacancyProposalCreateView(generics.CreateAPIView):
    serializer_class = VacancyProposalCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_vacancy(self):
        return get_object_or_404(
            JobOrder.objects.select_related('client'),
            pk=self.kwargs['vacancy_id'],
            status=ORDER_STATUS_CHOICES.open,
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['vacancy'] = self.get_vacancy()
        return context

    def create(self, request, *args, **kwargs):
        vacancy = self.get_vacancy()

        if request.user.user_type != USER_TYPE_CHOICES.worker:
            raise PermissionDenied("Faqat ustalar e`longa murojaat qila oladi.")
        if vacancy.client_id == request.user.id:
            raise PermissionDenied("O`zingizning e`loningizga murojaat qila olmaysiz.")

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        proposal = serializer.save()

        from apps.chat.models import ChatThread

        thread, _ = ChatThread.objects.get_or_create(
            proposal=proposal,
            defaults={
                'vacancy': proposal.vacancy,
                'client': proposal.vacancy.client,
                'worker': proposal.worker,
            },
        )

        message_text = (proposal.cover_letter or '').strip()
        if not message_text:
            message_text = "Assalomu alaykum, ushbu e`lon bo`yicha murojaat yubordim."
        if proposal.proposed_price:
            message_text = f"{message_text}\nTaklif narxi: {proposal.proposed_price} so`m"

        first_message = ChatMessage.objects.create(
            thread=thread,
            sender=proposal.worker,
            body=message_text,
        )
        broadcast_chat_message(thread.id, ChatMessageSerializer(first_message).data)


@extend_schema(tags=['Proposals'], summary='Ustaning yuborgan murojaatlari ro`yxati')
class MyProposalListView(generics.ListAPIView):
    serializer_class = VacancyProposalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.user_type != USER_TYPE_CHOICES.worker:
            raise PermissionDenied("Bu endpoint faqat ustalar uchun.")

        return (
            VacancyProposal.objects
            .select_related('vacancy', 'vacancy__client', 'worker')
            .filter(worker=self.request.user)
            .order_by('-created_at')
        )


@extend_schema(tags=['Proposals'], summary='Mijozga yuborilgan murojaatlar ro`yxati')
class ReceivedProposalListView(generics.ListAPIView):
    serializer_class = VacancyProposalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        vacancy_id = self.request.query_params.get('vacancy_id')
        queryset = (
            VacancyProposal.objects
            .select_related('vacancy', 'vacancy__client', 'worker')
            .filter(vacancy__client=self.request.user)
            .order_by('-created_at')
        )
        if vacancy_id:
            queryset = queryset.filter(vacancy_id=vacancy_id)
        return queryset


@extend_schema(tags=['Proposals'], summary='Mijoz murojaat statusini qabul/rad qiladi')
class ProposalStatusUpdateView(generics.UpdateAPIView):
    serializer_class = ProposalStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['patch']

    def get_queryset(self):
        return VacancyProposal.objects.filter(vacancy__client=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        next_status = serializer.validated_data['status']

        if next_status == PROPOSAL_STATUS_CHOICES.accepted:
            updated = accept_proposal(instance)
            notification_text = "Mijoz ushbu e`lon bo`yicha murojaatingizni qabul qildi."
        else:
            updated = reject_proposal(instance)
            notification_text = "Mijoz ushbu e`lon bo`yicha murojaatingizni rad etdi."

        serializer.instance = updated

        thread = getattr(updated, 'chat_thread', None)
        if thread is not None:
            visibility = CHAT_MESSAGE_VISIBILITY_CHOICES.all
            if next_status == PROPOSAL_STATUS_CHOICES.accepted:
                visibility = CHAT_MESSAGE_VISIBILITY_CHOICES.worker_only
            system_message = ChatMessage.objects.create(
                thread=thread,
                sender=self.request.user,
                body=notification_text,
                is_system=True,
                visibility=visibility,
            )
            broadcast_chat_message(thread.id, ChatMessageSerializer(system_message).data)
            broadcast_thread_update(
                thread.id,
                {
                    'proposal_status': updated.status,
                    'vacancy_status': updated.vacancy.status,
                    'assigned_worker_id': updated.vacancy.assigned_worker_id,
                },
            )
