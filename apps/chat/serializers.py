import os

from django.core.exceptions import ObjectDoesNotExist
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.models import USER_TYPE_CHOICES, WorkerProfile
from apps.proposals.models import PROPOSAL_STATUS_CHOICES
from apps.chat.models import ChatMessage, ChatThread
from apps.chat.presence import get_user_last_seen, get_user_online


class ChatMessageSerializer(serializers.ModelSerializer):
    body = serializers.CharField(required=False, allow_blank=True)
    attachment = serializers.FileField(required=False, allow_null=True, write_only=True)
    attachment_url = serializers.SerializerMethodField()
    attachment_name = serializers.SerializerMethodField()
    attachment_size = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)

    class Meta:
        model = ChatMessage
        fields = (
            'id',
            'sender_id',
            'sender_name',
            'body',
            'attachment',
            'attachment_url',
            'attachment_name',
            'attachment_size',
            'is_system',
            'visibility',
            'delivered_to_client_at',
            'delivered_to_worker_at',
            'read_by_client_at',
            'read_by_worker_at',
            'created_at',
        )
        read_only_fields = (
            'id',
            'sender_id',
            'sender_name',
            'attachment_url',
            'attachment_name',
            'attachment_size',
            'is_system',
            'visibility',
            'delivered_to_client_at',
            'delivered_to_worker_at',
            'read_by_client_at',
            'read_by_worker_at',
            'created_at',
        )

    def validate_body(self, value):
        return value.strip()

    def validate(self, attrs):
        body = attrs.get('body')
        attachment = attrs.get('attachment')
        if body is not None:
            attrs['body'] = body.strip()

        if not attrs.get('body') and not attachment:
            raise serializers.ValidationError("Xabar matni yoki fayl yuborish kerak.")

        return attrs

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_attachment_url(self, obj) -> str | None:
        file_obj = getattr(obj, 'attachment', None)
        if not file_obj:
            return None
        try:
            return file_obj.url
        except ValueError:
            return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_attachment_name(self, obj) -> str | None:
        file_obj = getattr(obj, 'attachment', None)
        if not file_obj:
            return None
        return os.path.basename(file_obj.name)

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_attachment_size(self, obj) -> int | None:
        file_obj = getattr(obj, 'attachment', None)
        if not file_obj:
            return None
        try:
            return file_obj.size
        except (ValueError, OSError):
            return None


class ChatProposalActionRequestSerializer(serializers.Serializer):
    proposal_id = serializers.IntegerField(required=False)


class ChatThreadStartRequestSerializer(serializers.Serializer):
    worker_id = serializers.IntegerField()
    vacancy_id = serializers.IntegerField(required=False, allow_null=True)
    initial_message = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class ChatThreadStartResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    thread_id = serializers.IntegerField()
    created = serializers.BooleanField()


class ChatMarkReadResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    thread_id = serializers.IntegerField()
    last_read_message_id = serializers.IntegerField(allow_null=True)
    at = serializers.DateTimeField()


class ChatProposalDecisionResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    proposal_id = serializers.IntegerField()
    proposal_status = serializers.CharField()
    vacancy_id = serializers.IntegerField()
    vacancy_status = serializers.CharField()
    assigned_worker_id = serializers.IntegerField(required=False, allow_null=True)


class ChatThreadSerializer(serializers.ModelSerializer):
    proposal_id = serializers.SerializerMethodField()
    proposal_status = serializers.SerializerMethodField()
    vacancy_id = serializers.SerializerMethodField()
    vacancy_title = serializers.SerializerMethodField()
    client_id = serializers.IntegerField(source='client.id', read_only=True)
    worker_id = serializers.IntegerField(source='worker.id', read_only=True)
    other_user_name = serializers.SerializerMethodField()
    other_user_phone = serializers.SerializerMethodField()
    other_user_photo = serializers.SerializerMethodField()
    other_user_type = serializers.SerializerMethodField()
    other_user_worker_profile_id = serializers.SerializerMethodField()
    other_user_online = serializers.SerializerMethodField()
    other_user_last_seen_at = serializers.SerializerMethodField()
    proposal_options = serializers.SerializerMethodField()
    can_accept = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    last_message_sender_id = serializers.SerializerMethodField()
    last_message_is_system = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = (
            'id',
            'proposal_id',
            'proposal_status',
            'vacancy_id',
            'vacancy_title',
            'client_id',
            'worker_id',
            'other_user_name',
            'other_user_phone',
            'other_user_photo',
            'other_user_type',
            'other_user_worker_profile_id',
            'other_user_online',
            'other_user_last_seen_at',
            'proposal_options',
            'can_accept',
            'last_message',
            'last_message_at',
            'last_message_sender_id',
            'last_message_is_system',
            'updated_at',
            'created_at',
        )

    def _user(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def _last_message_obj(self, obj):
        user = self._user()
        prefetched_messages = getattr(obj, 'prefetched_messages', None)
        if prefetched_messages is not None:
            return prefetched_messages[0] if prefetched_messages else None
        if user is None:
            return obj.messages.order_by('-created_at', '-id').first()
        return (
            obj.messages
            .filter(ChatMessage.visibility_filter_for_user(user))
            .order_by('-created_at', '-id')
            .first()
        )

    def _proposal_candidates(self, obj):
        prefetched_proposals = getattr(obj, 'prefetched_proposals', None)
        if prefetched_proposals is not None:
            return prefetched_proposals
        return list(
            obj.proposals.select_related('vacancy').order_by('-created_at', '-id')
        )

    def _active_proposal(self, obj):
        proposals = self._proposal_candidates(obj)
        for proposal in proposals:
            if proposal.status == PROPOSAL_STATUS_CHOICES.pending:
                return proposal
        return proposals[0] if proposals else None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_proposal_id(self, obj):
        proposal = self._active_proposal(obj)
        return proposal.id if proposal is not None else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_proposal_status(self, obj):
        proposal = self._active_proposal(obj)
        return proposal.status if proposal is not None else None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_vacancy_id(self, obj):
        proposal = self._active_proposal(obj)
        if proposal is not None:
            return proposal.vacancy_id
        return obj.vacancy_id

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_vacancy_title(self, obj):
        proposal = self._active_proposal(obj)
        if proposal is not None and proposal.vacancy_id:
            return proposal.vacancy.title
        if obj.vacancy_id:
            return obj.vacancy.title
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_last_message(self, obj):
        last = self._last_message_obj(obj)
        if last is None:
            return None
        body = (getattr(last, 'body', '') or '').strip()
        if body:
            return body
        attachment = getattr(last, 'attachment', None)
        if attachment:
            filename = os.path.basename(attachment.name or '')
            return f'📎 {filename or "Fayl yuborildi"}'
        return None

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_last_message_at(self, obj):
        last = self._last_message_obj(obj)
        return getattr(last, 'created_at', None)

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_last_message_sender_id(self, obj):
        last = self._last_message_obj(obj)
        return getattr(last, 'sender_id', None)

    @extend_schema_field(serializers.BooleanField())
    def get_last_message_is_system(self, obj):
        last = self._last_message_obj(obj)
        return getattr(last, 'is_system', False)

    @extend_schema_field(serializers.CharField())
    def get_other_user_name(self, obj):
        user = self._user()
        if not user:
            return ''
        other = obj.worker if obj.client_id == user.id else obj.client
        return other.full_name or other.email

    @extend_schema_field(serializers.CharField())
    def get_other_user_phone(self, obj):
        user = self._user()
        if not user:
            return ''
        other = obj.worker if obj.client_id == user.id else obj.client
        return other.phone_number

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_other_user_photo(self, obj):
        user = self._user()
        if not user:
            return None
        other = obj.worker if obj.client_id == user.id else obj.client
        photo = getattr(other, 'profile_photo', None)
        if not photo:
            return None
        filename = (getattr(photo, 'name', '') or '').rsplit('/', maxsplit=1)[-1]
        if filename in {'default_user.png', 'default_client.png', 'default_worker.png'}:
            return None
        try:
            return photo.url
        except ValueError:
            return None

    @extend_schema_field(serializers.CharField())
    def get_other_user_type(self, obj):
        user = self._user()
        if not user:
            return 'client'
        other = obj.worker if obj.client_id == user.id else obj.client
        return getattr(other, 'user_type', 'client') or 'client'

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_other_user_worker_profile_id(self, obj):
        other = self._other_user(obj)
        if other is None:
            return None
        if getattr(other, 'user_type', None) != USER_TYPE_CHOICES.worker:
            return None

        try:
            profile = other.worker_profile
        except ObjectDoesNotExist:
            profile = None

        if profile is not None:
            return profile.id

        profile, _ = WorkerProfile.objects.get_or_create(user=other)
        return profile.id

    def _other_user(self, obj):
        user = self._user()
        if not user:
            return None
        return obj.worker if obj.client_id == user.id else obj.client

    @extend_schema_field(serializers.BooleanField())
    def get_other_user_online(self, obj):
        other = self._other_user(obj)
        if other is None:
            return False
        return get_user_online(other.id)

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_other_user_last_seen_at(self, obj):
        other = self._other_user(obj)
        if other is None:
            return None
        return get_user_last_seen(other.id)

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_proposal_options(self, obj):
        proposals = self._proposal_candidates(obj)
        return [
            {
                'id': proposal.id,
                'vacancy_id': proposal.vacancy_id,
                'vacancy_title': proposal.vacancy.title if proposal.vacancy_id else None,
                'status': proposal.status,
                'created_at': proposal.created_at,
            }
            for proposal in proposals
        ]

    @extend_schema_field(serializers.BooleanField())
    def get_can_accept(self, obj):
        user = self._user()
        proposal = self._active_proposal(obj)
        if not user:
            return False
        return (
            user.id == obj.client_id
            and proposal is not None
            and proposal.status == PROPOSAL_STATUS_CHOICES.pending
        )
