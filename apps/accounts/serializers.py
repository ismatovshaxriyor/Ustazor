from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError
from django.db import transaction
from django.templatetags.static import static
from django.template.loader import render_to_string
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import USER_TYPE_CHOICES, WorkerProfile, WorkerSkill
from apps.accounts.services.activation import (
    clear_activation_payload,
    generate_activation_code,
    get_activation_payload,
    get_remaining_resend_cooldown,
    register_failed_attempt,
    set_activation_payload,
)

User = get_user_model()


DEFAULT_PROFILE_FILENAMES = {'default_client.png', 'default_worker.png'}


def _profile_photo_filename(user) -> str:
    if not getattr(user, 'profile_photo', None):
        return ''
    name = (user.profile_photo.name or '').strip()
    if not name:
        return ''
    return name.rsplit('/', maxsplit=1)[-1]


def _is_default_profile_photo(user) -> bool:
    return _profile_photo_filename(user) in DEFAULT_PROFILE_FILENAMES


def _default_profile_photo_url(user, request=None) -> str:
    default_path = static('image/default_worker.png')
    if user.user_type == USER_TYPE_CHOICES.client:
        default_path = static('image/default_client.png')

    if request is not None:
        return request.build_absolute_uri(default_path)
    return default_path


def _profile_photo_url(user, request=None) -> str:
    if not user.profile_photo:
        return _default_profile_photo_url(user, request=request)

    if _is_default_profile_photo(user):
        return _default_profile_photo_url(user, request=request)

    try:
        url = user.profile_photo.url
    except ValueError:
        return _default_profile_photo_url(user, request=request)

    if request is not None:
        return request.build_absolute_uri(url)
    return url


def _activation_config() -> dict:
    return {
        'code_length': int(getattr(settings, 'ACTIVATION_CODE_LENGTH', 5)),
        'expires_minutes': int(getattr(settings, 'ACTIVATION_CODE_EXPIRE_MINUTES', 10)),
        'resend_cooldown_seconds': int(getattr(settings, 'ACTIVATION_RESEND_COOLDOWN_SECONDS', 60)),
        'max_attempts': int(getattr(settings, 'ACTIVATION_MAX_ATTEMPTS', 5)),
    }


def _send_activation_email(user, code: str, expires_minutes: int, code_length: int) -> None:
    context = {
        'full_name': user.full_name or 'Foydalanuvchi',
        'code': code,
        'code_length': code_length,
        'expires_minutes': expires_minutes,
        'project_name': 'Ustazor',
    }

    subject = 'Ustazor - Email tasdiqlash kodi'
    text_body = render_to_string('emails/activation_code.txt', context)
    html_body = render_to_string('emails/activation_code.html', context)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(html_body, 'text/html')
    message.send(fail_silently=False)


def _issue_and_send_activation_code(user) -> None:
    config = _activation_config()
    code = generate_activation_code(length=config['code_length'])
    ttl_seconds = config['expires_minutes'] * 60

    set_activation_payload(
        email=user.email,
        code=code,
        ttl_seconds=ttl_seconds,
        resend_cooldown_seconds=config['resend_cooldown_seconds'],
    )
    _send_activation_email(user, code, config['expires_minutes'], config['code_length'])


class UserSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'phone_number',
            'full_name',
            'profile_photo_url',
            'user_type',
            'is_verified',
            'date_joined',
        )
        read_only_fields = ('id', 'is_verified', 'date_joined')

    def get_profile_photo_url(self, obj) -> str:
        return _profile_photo_url(obj, self.context.get('request'))


class MeProfileSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField(read_only=True)
    profile_photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'phone_number',
            'full_name',
            'user_type',
            'profile_photo',
            'profile_photo_url',
            'is_verified',
            'date_joined',
        )
        read_only_fields = ('id', 'email', 'user_type', 'profile_photo_url', 'is_verified', 'date_joined')

    def validate_phone_number(self, value):
        user = self.instance
        qs = User.objects.filter(phone_number=value)
        if user is not None:
            qs = qs.exclude(pk=user.pk)

        if qs.exists():
            raise serializers.ValidationError('Bu telefon raqami allaqachon ro\'yxatdan o\'tgan.')
        return value

    def get_profile_photo_url(self, obj) -> str:
        return _profile_photo_url(obj, self.context.get('request'))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if _is_default_profile_photo(instance):
            data['profile_photo'] = None
        return data


class WorkerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerProfile
        fields = (
            'id',
            'specialization',
            'experience_years',
            'service_city',
            'about',
            'min_order_price',
            'is_available',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_min_order_price(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Minimal narx 0 dan katta bo'lishi kerak.")
        return value


class WorkerSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerSkill
        fields = (
            'id',
            'title',
            'description',
            'min_price',
            'max_price',
            'experience_years',
            'extra_info',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_title(self, value):
        clean_value = value.strip()
        if not clean_value:
            raise serializers.ValidationError("Xizmat nomi bo'sh bo'lishi mumkin emas.")
        return clean_value

    def validate_experience_years(self, value):
        if value < 0:
            raise serializers.ValidationError("Tajriba yili manfiy bo'lishi mumkin emas.")
        return value

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        min_price = attrs.get('min_price', getattr(instance, 'min_price', None))
        max_price = attrs.get('max_price', getattr(instance, 'max_price', None))

        if min_price is not None and min_price <= 0:
            raise serializers.ValidationError({'min_price': "Minimal narx 0 dan katta bo'lishi kerak."})
        if max_price is not None and max_price <= 0:
            raise serializers.ValidationError({'max_price': "Maksimal narx 0 dan katta bo'lishi kerak."})
        if min_price is not None and max_price is not None and min_price > max_price:
            raise serializers.ValidationError({'max_price': "Maksimal narx minimal narxdan kichik bo'lishi mumkin emas."})

        return attrs


class WorkerPublicSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerSkill
        fields = (
            'id',
            'title',
            'description',
            'min_price',
            'max_price',
            'experience_years',
            'extra_info',
        )


class WorkerPublicListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = WorkerProfile
        fields = (
            'id',
            'full_name',
            'profile_photo_url',
            'specialization',
            'experience_years',
            'service_city',
            'about',
            'min_order_price',
            'is_available',
            'skills',
        )

    def get_profile_photo_url(self, obj) -> str:
        return _profile_photo_url(obj.user, self.context.get('request'))

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_skills(self, obj) -> list[str]:
        active_skills = getattr(obj, 'active_skills', None)
        if active_skills is None:
            active_skills = obj.skills.filter(is_active=True)
        return [item.title for item in active_skills[:5]]


class WorkerPublicDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = WorkerProfile
        fields = (
            'id',
            'full_name',
            'email',
            'phone_number',
            'profile_photo_url',
            'specialization',
            'experience_years',
            'service_city',
            'about',
            'min_order_price',
            'is_available',
            'skills',
        )

    def get_profile_photo_url(self, obj) -> str:
        return _profile_photo_url(obj.user, self.context.get('request'))

    @extend_schema_field(WorkerPublicSkillSerializer(many=True))
    def get_skills(self, obj) -> list[dict]:
        active_skills = getattr(obj, 'active_skills', None)
        if active_skills is None:
            active_skills = obj.skills.filter(is_active=True)
        return WorkerPublicSkillSerializer(active_skills, many=True).data


class WorkerDashboardSerializer(serializers.Serializer):
    profile = WorkerProfileSerializer()
    skills_count = serializers.IntegerField()
    active_skills_count = serializers.IntegerField()
    open_orders_count = serializers.IntegerField()
    in_progress_orders_count = serializers.IntegerField()
    completed_orders_count = serializers.IntegerField()
    profile_completion_percent = serializers.IntegerField()


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(validators=[])
    phone_number = serializers.CharField(validators=[])
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            'email',
            'phone_number',
            'full_name',
            'user_type',
            'password',
        )
        extra_kwargs = {
            'user_type': {'required': False},
        }

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('Bu email allaqachon ro\'yxatdan o\'tgan.')
        return email

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('Bu telefon raqami allaqachon ro\'yxatdan o\'tgan.')
        return value

    def validate_user_type(self, value):
        valid_user_types = {choice[0] for choice in USER_TYPE_CHOICES.choices}
        if value not in valid_user_types:
            raise serializers.ValidationError("Noto'g'ri user_type yuborildi.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.setdefault('user_type', USER_TYPE_CHOICES.client)

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    password=password,
                    is_active=False,
                    is_verified=False,
                    **validated_data,
                )
                _issue_and_send_activation_code(user)
        except IntegrityError:
            raise serializers.ValidationError(
                {'detail': 'Bu email yoki telefon raqami allaqachon ro\'yxatdan o\'tgan.'}
            )

        return user


class VerifyActivationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=10)

    def validate(self, attrs):
        email = attrs['email'].lower().strip()
        code = attrs['code'].strip()
        config = _activation_config()
        expected_length = config['code_length']

        if not code.isdigit() or len(code) != expected_length:
            raise serializers.ValidationError(
                {'code': f'Kod {expected_length} xonali raqam bo\'lishi kerak.'}
            )

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise serializers.ValidationError({'email': 'Bunday email topilmadi.'})

        if user.is_verified:
            raise serializers.ValidationError({'email': 'Email allaqachon tasdiqlangan.'})

        payload = get_activation_payload(email)
        if not payload:
            raise serializers.ValidationError({'code': 'Kod topilmadi yoki muddati tugagan. Qaytadan yuboring.'})

        ttl_seconds = config['expires_minutes'] * 60

        if payload.code != code:
            attempts, is_blocked = register_failed_attempt(
                email=email,
                ttl_seconds=ttl_seconds,
                max_attempts=config['max_attempts'],
            )

            if is_blocked:
                clear_activation_payload(email)
                raise serializers.ValidationError(
                    {'code': 'Kod bir necha marta noto\'g\'ri kiritildi. Yangi kod yuboring.'}
                )

            remaining = config['max_attempts'] - attempts
            raise serializers.ValidationError({'code': f"Kod noto'g'ri. Qolgan urinishlar: {remaining}"})

        attrs['user'] = user
        attrs['email'] = email
        return attrs

    def save(self):
        user = self.validated_data['user']
        email = self.validated_data['email']

        user.is_verified = True
        user.is_active = True
        user.save(update_fields=['is_verified', 'is_active'])
        clear_activation_payload(email)

        return user


class ResendActivationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        email = attrs['email'].lower().strip()

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise serializers.ValidationError({'email': 'Bunday email topilmadi.'})

        if user.is_verified:
            raise serializers.ValidationError({'email': 'Email allaqachon tasdiqlangan.'})

        cooldown_seconds = get_remaining_resend_cooldown(email)
        if cooldown_seconds > 0:
            raise serializers.ValidationError(
                {'email': f'Kod qayta yuborish uchun {cooldown_seconds} soniya kuting.'}
            )

        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        _issue_and_send_activation_code(user)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['user_type'] = user.user_type
        return token

    def validate(self, attrs):
        username_field = self.username_field
        attrs[username_field] = attrs[username_field].lower().strip()
        code_length = int(getattr(settings, 'ACTIVATION_CODE_LENGTH', 5))

        user = User.objects.filter(email__iexact=attrs[username_field]).first()
        if user and not user.is_verified:
            raise AuthenticationFailed(
                f'Email tasdiqlanmagan. {code_length} xonali kodni kiriting.'
            )

        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
