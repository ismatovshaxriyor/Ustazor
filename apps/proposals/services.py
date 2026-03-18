from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.jobs.models import ORDER_STATUS_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal


def accept_proposal(proposal: VacancyProposal) -> VacancyProposal:
    if proposal.status != PROPOSAL_STATUS_CHOICES.pending:
        raise ValidationError("Faqat kutilayotgan murojaatni qabul qilish mumkin.")

    with transaction.atomic():
        proposal.status = PROPOSAL_STATUS_CHOICES.accepted
        proposal.save(update_fields=['status', 'updated_at'])

        vacancy = proposal.vacancy
        vacancy.assigned_worker = proposal.worker
        vacancy.status = ORDER_STATUS_CHOICES.in_progress
        vacancy.save(update_fields=['assigned_worker', 'status', 'updated_at'])

        VacancyProposal.objects.filter(
            vacancy=vacancy,
            status=PROPOSAL_STATUS_CHOICES.pending,
        ).exclude(pk=proposal.pk).update(
            status=PROPOSAL_STATUS_CHOICES.rejected,
            updated_at=timezone.now(),
        )

    proposal.refresh_from_db()
    return proposal


def reject_proposal(proposal: VacancyProposal) -> VacancyProposal:
    if proposal.status != PROPOSAL_STATUS_CHOICES.pending:
        raise ValidationError("Faqat kutilayotgan murojaatni rad qilish mumkin.")

    proposal.status = PROPOSAL_STATUS_CHOICES.rejected
    proposal.save(update_fields=['status', 'updated_at'])
    proposal.refresh_from_db()
    return proposal
