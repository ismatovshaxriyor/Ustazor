from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class PRICE_TYPE_CHOICES(models.TextChoices):
    negotiable = 'negotiable', 'Kelishiladi'
    fixed = 'fixed', 'Aniq narx'


class ORDER_STATUS_CHOICES(models.TextChoices):
    open = 'open', 'Yangi'
    in_progress = 'in_progress', 'Jarayonda'
    completed = 'completed', 'Yakunlangan'
    cancelled = 'cancelled', 'Bekor qilingan'


class JobOrder(models.Model):
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    assigned_worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='assigned_orders',
        blank=True,
        null=True,
    )
    title = models.CharField(max_length=140)
    description = models.TextField()
    category = models.CharField(max_length=80, blank=True)
    city = models.CharField(max_length=80, blank=True)
    address = models.CharField(max_length=255, blank=True)
    price_type = models.CharField(
        max_length=20,
        choices=PRICE_TYPE_CHOICES.choices,
        default=PRICE_TYPE_CHOICES.negotiable,
    )
    price_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        help_text='Aniq narx rejimi uchun qiymat',
    )
    status = models.CharField(
        max_length=20,
        choices=ORDER_STATUS_CHOICES.choices,
        default=ORDER_STATUS_CHOICES.open,
    )
    due_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Buyurtma'
        verbose_name_plural = 'Buyurtmalar'

    def __str__(self):
        return f'{self.title} ({self.client_id})'

    def clean(self):
        if self.price_type == PRICE_TYPE_CHOICES.fixed:
            if self.price_amount is None:
                raise ValidationError({'price_amount': "Aniq narx rejimida narx kiritilishi shart."})
            if self.price_amount <= 0:
                raise ValidationError({'price_amount': "Narx 0 dan katta bo'lishi kerak."})

        if self.price_type == PRICE_TYPE_CHOICES.negotiable:
            self.price_amount = None
