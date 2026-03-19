from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.proposals.models import PROPOSAL_STATUS_CHOICES
from apps.chat.models import ChatMessage, ChatThread
from apps.chat.presence import get_user_last_seen, get_user_online


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)

    class Meta:
        model = ChatMessage
        fields = (
            'id',
            'sender_id',
            'sender_name',
            'body',
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
            'is_system',
            'visibility',
            'delivered_to_client_at',
            'delivered_to_worker_at',
            'read_by_client_at',
            'read_by_worker_at',
            'created_at',
        )

    def validate_body(self, value):
        clean_value = value.strip()
        if not clean_value:
            raise serializers.ValidationError("Xabar bo`sh bo`lishi mumkin emas.")
        return clean_value


class ChatThreadSerializer(serializers.ModelSerializer):
    proposal_id = serializers.IntegerField(source='proposal.id', read_only=True)
    proposal_status = serializers.CharField(source='proposal.status', read_only=True)
    vacancy_id = serializers.IntegerField(source='vacancy.id', read_only=True)
    vacancy_title = serializers.CharField(source='vacancy.title', read_only=True)
    client_id = serializers.IntegerField(source='client.id', read_only=True)
    worker_id = serializers.IntegerField(source='worker.id', read_only=True)
    other_user_name = serializers.SerializerMethodField()
    other_user_phone = serializers.SerializerMethodField()
    other_user_photo = serializers.SerializerMethodField()
    other_user_type = serializers.SerializerMethodField()
    other_user_online = serializers.SerializerMethodField()
    other_user_last_seen_at = serializers.SerializerMethodField()
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
            'other_user_online',
            'other_user_last_seen_at',
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

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_last_message(self, obj):
        last = self._last_message_obj(obj)
        return getattr(last, 'body', None)

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

    @extend_schema_field(serializers.BooleanField())
    def get_can_accept(self, obj):
        user = self._user()
        if not user:
            return False
        return (
            user.id == obj.client_id
            and obj.proposal.status == PROPOSAL_STATUS_CHOICES.pending
        )
