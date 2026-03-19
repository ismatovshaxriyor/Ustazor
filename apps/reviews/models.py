from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES


def review_image_upload_path(instance, filename):
    return f'reviews/{instance.review_id}/{filename}'


def portfolio_image_upload_path(instance, filename):
    return f'portfolio/{instance.portfolio_id}/{filename}'


class WorkerReview(models.Model):
    order = models.OneToOneField(
        JobOrder,
        on_delete=models.CASCADE,
        related_name='worker_review',
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_worker_reviews',
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_worker_reviews',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Usta bahosi'
        verbose_name_plural = 'Usta baholari'

    def __str__(self):
        return f'WorkerReview<{self.id}:{self.worker_id}:{self.rating}>'

    def clean(self):
        if self.client_id and self.worker_id and self.client_id == self.worker_id:
            raise ValidationError({'worker': "Mijoz o`ziga baho bera olmaydi."})

        if self.worker_id and getattr(self.worker, 'user_type', None) != USER_TYPE_CHOICES.worker:
            raise ValidationError({'worker': 'Faqat usta akkauntiga baho berish mumkin.'})

        if self.order_id:
            if self.order.client_id != self.client_id:
                raise ValidationError({'order': "Bu e`lon sizga tegishli emas."})
            if not self.order.assigned_worker_id:
                raise ValidationError({'order': "Bu e`longa hali usta biriktirilmagan."})
            if self.order.assigned_worker_id != self.worker_id:
                raise ValidationError({'worker': "Faqat biriktirilgan ustaga baho berish mumkin."})
            if self.order.status != ORDER_STATUS_CHOICES.completed:
                raise ValidationError({'order': "Faqat yakunlangan e`lon uchun baho berish mumkin."})


class WorkerReviewImage(models.Model):
    review = models.ForeignKey(
        WorkerReview,
        on_delete=models.CASCADE,
        related_name='images',
    )
    image = models.ImageField(upload_to=review_image_upload_path)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at', 'id')
        verbose_name = 'Baho rasmi'
        verbose_name_plural = 'Baho rasmlari'

    def __str__(self):
        return f'WorkerReviewImage<{self.id}:{self.review_id}>'


class WorkerPortfolio(models.Model):
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='portfolio_items',
    )
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=120, blank=True)
    completed_at = models.DateField(blank=True, null=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-is_featured', '-created_at')
        verbose_name = 'Usta portfolio ishi'
        verbose_name_plural = 'Usta portfolio ishlari'

    def __str__(self):
        return f'WorkerPortfolio<{self.id}:{self.worker_id}>'

    def clean(self):
        if self.worker_id and getattr(self.worker, 'user_type', None) != USER_TYPE_CHOICES.worker:
            raise ValidationError({'worker': 'Portfolio faqat usta akkaunti uchun.'})


class WorkerPortfolioImage(models.Model):
    portfolio = models.ForeignKey(
        WorkerPortfolio,
        on_delete=models.CASCADE,
        related_name='images',
    )
    image = models.ImageField(upload_to=portfolio_image_upload_path)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at', 'id')
        verbose_name = 'Portfolio rasmi'
        verbose_name_plural = 'Portfolio rasmlari'

    def __str__(self):
        return f'WorkerPortfolioImage<{self.id}:{self.portfolio_id}>'
