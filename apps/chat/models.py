from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

from apps.jobs.models import JobOrder


class CHAT_MESSAGE_VISIBILITY_CHOICES(models.TextChoices):
    all = 'all', 'Hamma uchun'
    client_only = 'client_only', 'Faqat mijoz'
    worker_only = 'worker_only', 'Faqat usta'


class ChatThread(models.Model):
    vacancy = models.ForeignKey(
        JobOrder,
        on_delete=models.CASCADE,
        related_name='chat_threads',
        null=True,
        blank=True,
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_chat_threads',
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='worker_chat_threads',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at', '-created_at')
        verbose_name = 'Chat suhbati'
        verbose_name_plural = 'Chat suhbatlari'
        constraints = [
            models.UniqueConstraint(
                fields=('client', 'worker', 'vacancy'),
                name='unique_client_worker_vacancy_chat_thread',
            )
        ]

    def __str__(self):
        return f'ChatThread<{self.id}>'

    def clean(self):
        if self.client_id and self.client_id == self.worker_id:
            raise ValidationError("Mijoz va usta bir xil bo`lishi mumkin emas.")


class ChatMessage(models.Model):
    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages',
    )
    body = models.TextField()
    attachment = models.FileField(upload_to='chat/messages/%Y/%m/%d/', blank=True, null=True)
    is_system = models.BooleanField(default=False)
    visibility = models.CharField(
        max_length=20,
        choices=CHAT_MESSAGE_VISIBILITY_CHOICES.choices,
        default=CHAT_MESSAGE_VISIBILITY_CHOICES.all,
    )
    delivered_to_client_at = models.DateTimeField(blank=True, null=True)
    delivered_to_worker_at = models.DateTimeField(blank=True, null=True)
    read_by_client_at = models.DateTimeField(blank=True, null=True)
    read_by_worker_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at', 'id')
        verbose_name = 'Chat xabari'
        verbose_name_plural = 'Chat xabarlari'

    def __str__(self):
        return f'ChatMessage<{self.id}:{self.thread_id}>'

    def clean(self):
        if self.sender_id and self.thread_id:
            if self.sender_id not in {self.thread.client_id, self.thread.worker_id}:
                raise ValidationError({'sender': 'Xabar yuboruvchi suhbat ishtirokchisi bo`lishi kerak.'})

    @classmethod
    def visibility_filter_for_user(cls, user):
        return (
            models.Q(visibility=CHAT_MESSAGE_VISIBILITY_CHOICES.all)
            | models.Q(visibility=CHAT_MESSAGE_VISIBILITY_CHOICES.client_only, thread__client=user)
            | models.Q(visibility=CHAT_MESSAGE_VISIBILITY_CHOICES.worker_only, thread__worker=user)
        )
