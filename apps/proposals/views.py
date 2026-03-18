from drf_spectacular.utils import extend_schema
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal
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
        serializer.save()


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
        if instance.status != PROPOSAL_STATUS_CHOICES.pending:
            raise PermissionDenied("Faqat kutilayotgan murojaatni yangilash mumkin.")
        serializer.save()
