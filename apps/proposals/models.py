from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES


class PROPOSAL_STATUS_CHOICES(models.TextChoices):
    pending = 'pending', 'Kutilmoqda'
    accepted = 'accepted', 'Qabul qilingan'
    rejected = 'rejected', 'Rad etilgan'
    withdrawn = 'withdrawn', 'Bekor qilingan'


class VacancyProposal(models.Model):
    vacancy = models.ForeignKey(
        JobOrder,
        on_delete=models.CASCADE,
        related_name='proposals',
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vacancy_proposals',
    )
    cover_letter = models.TextField(blank=True)
    proposed_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=20,
        choices=PROPOSAL_STATUS_CHOICES.choices,
        default=PROPOSAL_STATUS_CHOICES.pending,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('vacancy', 'worker'),
                name='unique_worker_vacancy_proposal',
            )
        ]
        verbose_name = "E`longa murojaat"
        verbose_name_plural = "E`longa murojaatlar"

    def __str__(self):
        return f'Proposal<{self.vacancy_id}:{self.worker_id}>'

    def clean(self):
        if self.worker_id and self.worker.user_type != USER_TYPE_CHOICES.worker:
            raise ValidationError({'worker': "Faqat ustalar e`longa murojaat qila oladi."})

        if self.vacancy_id:
            if self.vacancy.status != ORDER_STATUS_CHOICES.open:
                raise ValidationError({'vacancy': "Faqat ochiq e`longa murojaat yuborish mumkin."})
            if self.vacancy.client_id == self.worker_id:
                raise ValidationError({'worker': "O`zingizning e`loningizga murojaat qila olmaysiz."})

        if self.proposed_price is not None and self.proposed_price <= 0:
            raise ValidationError({'proposed_price': "Taklif narxi 0 dan katta bo`lishi kerak."})
