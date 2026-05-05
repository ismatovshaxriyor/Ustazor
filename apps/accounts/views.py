from datetime import timedelta

from drf_spectacular.utils import extend_schema
import jwt
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, FloatField, Prefetch, Q, Value
from django.db.models.functions import Coalesce
from django.utils.crypto import get_random_string
from django.utils import timezone
from rest_framework import generics, parsers, permissions, status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from jwt import PyJWKClient

from apps.accounts.serializers import (
    ClerkExchangeSerializer,
    DEFAULT_PROFILE_FILENAMES,
    CustomTokenObtainPairSerializer,
    MeProfileSerializer,
    UserSerializer,
    WorkerPublicDetailSerializer,
    WorkerPublicListSerializer,
    RegisterSerializer,
    ResendActivationSerializer,
    VerifyActivationSerializer,
    WorkerDashboardSerializer,
    WorkerProfileSerializer,
    WorkerSkillSerializer,
)
from apps.accounts.models import USER_TYPE_CHOICES, WorkerProfile, WorkerProfileView as WorkerProfileViewLog, WorkerSkill
from apps.jobs.models import ORDER_STATUS_CHOICES, JobOrder
from apps.reviews.models import WorkerPortfolio, WorkerReview

User = get_user_model()


def _normalize_phone(value: str) -> str:
    raw = (value or '').strip()
    if not raw:
        return ''

    has_plus = raw.startswith('+')
    digits = ''.join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ''

    normalized = f"+{digits}" if has_plus else digits
    if len(digits) < 9 or len(normalized) > 15:
        return ''
    return normalized


def _generate_unique_placeholder_phone() -> str:
    for _ in range(100):
        candidate = f"+99899{get_random_string(7, allowed_chars='0123456789')}"
        if not User.objects.filter(phone_number=candidate).exists():
            return candidate
    raise ValueError("Telefon raqam generatsiya qilib bo`lmadi.")


def _extract_bearer_token(request) -> str:
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.lower().startswith('bearer '):
        return ''
    return auth_header.split(' ', maxsplit=1)[1].strip()


def _decode_clerk_session_token(session_token: str) -> dict:
    try:
        unverified_claims = jwt.decode(
            session_token,
            options={
                'verify_signature': False,
                'verify_exp': False,
                'verify_nbf': False,
                'verify_iat': False,
            },
            algorithms=['RS256'],
        )
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailed("Clerk token noto`g`ri.") from exc

    issuer = str(unverified_claims.get('iss') or '').strip().rstrip('/')
    if not issuer.startswith('http://') and not issuer.startswith('https://'):
        raise AuthenticationFailed('Clerk token issuer topilmadi.')

    jwks_url = f'{issuer}/.well-known/jwks.json'
    try:
        signing_key = PyJWKClient(jwks_url).get_signing_key_from_jwt(session_token).key
        claims = jwt.decode(
            session_token,
            signing_key,
            algorithms=['RS256'],
            issuer=issuer,
            options={'require': ['sub', 'exp', 'iat']},
        )
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailed('Clerk token tekshiruvidan o`tmadi.') from exc
    except Exception as exc:
        raise AuthenticationFailed('Clerk tokenni tekshirishda xatolik yuz berdi.') from exc

    return claims


def _upsert_user_from_clerk_payload(
    *,
    clerk_user_id: str,
    email: str,
    full_name: str,
    phone_number: str,
    user_type: str,
) -> tuple[User, bool, bool]:
    normalized_clerk_user_id = (clerk_user_id or '').strip()
    if not normalized_clerk_user_id:
        raise AuthenticationFailed('Clerk user identifikatori topilmadi.')

    normalized_email = email.lower().strip()
    normalized_phone = _normalize_phone(phone_number)
    normalized_user_type = user_type if user_type in {USER_TYPE_CHOICES.client, USER_TYPE_CHOICES.worker} else ''
    phone_required = False
    user_type_required = False

    user = User.objects.filter(clerk_user_id=normalized_clerk_user_id).first()
    if user is None:
        user = User.objects.filter(email__iexact=normalized_email).first()
        if user and user.clerk_user_id and user.clerk_user_id != normalized_clerk_user_id:
            raise AuthenticationFailed('Bu email boshqa Clerk akkaunti bilan bog`langan.')

    if user is None:
        if normalized_phone:
            owner = User.objects.filter(phone_number=normalized_phone).first()
            if owner is not None:
                raise AuthenticationFailed('Bu telefon raqami boshqa foydalanuvchiga tegishli.')
            selected_phone = normalized_phone
        else:
            selected_phone = _generate_unique_placeholder_phone()
            phone_required = True

        selected_user_type = normalized_user_type or USER_TYPE_CHOICES.client
        if not normalized_user_type:
            user_type_required = True

        user = User.objects.create_user(
            email=normalized_email,
            clerk_user_id=normalized_clerk_user_id,
            password=get_random_string(40),
            phone_number=selected_phone,
            full_name=full_name.strip()[:30] if full_name else '',
            user_type=selected_user_type,
            is_active=True,
            is_verified=True,
        )
        return user, phone_required, user_type_required

    update_fields = []
    if not user.is_active:
        user.is_active = True
        update_fields.append('is_active')
    if not user.is_verified:
        user.is_verified = True
        update_fields.append('is_verified')
    if full_name and not user.full_name:
        user.full_name = full_name.strip()[:30]
        update_fields.append('full_name')
    if user.clerk_user_id != normalized_clerk_user_id:
        if User.objects.filter(clerk_user_id=normalized_clerk_user_id).exclude(pk=user.pk).exists():
            raise AuthenticationFailed('Bu Clerk akkaunti boshqa foydalanuvchiga tegishli.')
        user.clerk_user_id = normalized_clerk_user_id
        update_fields.append('clerk_user_id')

    if normalized_phone and user.phone_number != normalized_phone:
        owner = User.objects.filter(phone_number=normalized_phone).exclude(pk=user.pk).first()
        if owner is not None:
            raise AuthenticationFailed('Bu telefon raqami boshqa foydalanuvchiga tegishli.')
        user.phone_number = normalized_phone
        update_fields.append('phone_number')
    elif not normalized_phone:
        # Clerk akkauntida telefon bo'lmasa, faqat lokal bazada ham yo'q bo'lsa so'raymiz.
        phone_required = not bool(_normalize_phone(user.phone_number))

    current_user_type = (user.user_type or '').strip()
    current_user_type_valid = current_user_type in {USER_TYPE_CHOICES.client, USER_TYPE_CHOICES.worker}
    if normalized_user_type and (not current_user_type_valid):
        user.user_type = normalized_user_type
        update_fields.append('user_type')
    elif not current_user_type_valid:
        user_type_required = True

    if update_fields:
        user.save(update_fields=update_fields)
    return user, phone_required, user_type_required


def _worker_profile_for_user(user):
    if user.user_type != USER_TYPE_CHOICES.worker:
        raise PermissionDenied("Bu endpoint faqat ustalar uchun.")
    profile, _ = WorkerProfile.objects.get_or_create(user=user)
    return profile


@extend_schema(tags=['Auth'], summary='Tizimga kirish (JWT token olish)')
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth_login'


@extend_schema(tags=['Auth'], summary='Access tokenni yangilash')
class CustomTokenRefreshView(TokenRefreshView):
    pass


@extend_schema(tags=['Auth'], summary='Access tokenni tekshirish')
class CustomTokenVerifyView(TokenVerifyView):
    pass


@extend_schema(tags=['Auth'], summary='Refresh tokenni blacklistga qo`shish (logout)')
class CustomTokenBlacklistView(TokenBlacklistView):
    pass


def _public_worker_queryset():
    active_skills_prefetch = Prefetch(
        'skills',
        queryset=WorkerSkill.objects.filter(is_active=True).order_by('-updated_at', '-created_at'),
        to_attr='active_skills',
    )
    public_reviews_prefetch = Prefetch(
        'user__received_worker_reviews',
        queryset=(
            WorkerReview.objects
            .select_related('client', 'worker', 'order')
            .prefetch_related('images')
            .order_by('-created_at')
        ),
        to_attr='public_reviews',
    )
    public_portfolio_prefetch = Prefetch(
        'user__portfolio_items',
        queryset=WorkerPortfolio.objects.prefetch_related('images').order_by('-is_featured', '-created_at'),
        to_attr='public_portfolio',
    )
    return (
        WorkerProfile.objects
        .select_related('user')
        .prefetch_related(active_skills_prefetch, public_reviews_prefetch, public_portfolio_prefetch)
        .filter(
            user__is_active=True,
            user__is_verified=True,
            user__user_type=USER_TYPE_CHOICES.worker,
        )
        .annotate(
            rating_avg=Coalesce(
                Avg('user__received_worker_reviews__rating'),
                Value(0.0),
                output_field=FloatField(),
            ),
            rating_count=Count('user__received_worker_reviews', distinct=True),
        )
    )


@extend_schema(tags=['Public'], summary='Ustalar ro`yxatini olish va qidirish')
class PublicWorkerListView(generics.ListAPIView):
    serializer_class = WorkerPublicListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = _public_worker_queryset()

        query = (self.request.query_params.get('q') or '').strip()
        category = (self.request.query_params.get('category') or '').strip()
        city = (self.request.query_params.get('city') or '').strip()
        available = (self.request.query_params.get('available') or '').strip().lower()
        min_rating = (self.request.query_params.get('min_rating') or '').strip()
        min_experience = (self.request.query_params.get('min_experience') or '').strip()
        sort = (self.request.query_params.get('sort') or 'rating_desc').strip().lower()

        if query:
            queryset = queryset.filter(
                Q(user__full_name__icontains=query)
                | Q(specialization__icontains=query)
                | Q(service_city__icontains=query)
                | Q(about__icontains=query)
                | Q(skills__title__icontains=query)
                | Q(skills__description__icontains=query)
            )

        if category:
            queryset = queryset.filter(
                Q(specialization__icontains=category) | Q(skills__title__icontains=category)
            )

        if city:
            queryset = queryset.filter(service_city__icontains=city)

        if available in {'1', 'true', 'yes'}:
            queryset = queryset.filter(is_available=True)
        elif available in {'0', 'false', 'no'}:
            queryset = queryset.filter(is_available=False)

        if min_rating:
            try:
                min_rating_value = float(min_rating)
            except (TypeError, ValueError):
                min_rating_value = 0.0
            queryset = queryset.filter(rating_avg__gte=min_rating_value)

        if min_experience:
            try:
                min_experience_value = max(int(float(min_experience)), 0)
            except (TypeError, ValueError):
                min_experience_value = None
            if min_experience_value is not None:
                queryset = queryset.filter(experience_years__gte=min_experience_value)

        if sort == 'rating_asc':
            ordering = ('rating_avg', '-rating_count', '-updated_at', '-created_at')
        elif sort == 'newest':
            ordering = ('-updated_at', '-created_at')
        else:
            ordering = ('-rating_avg', '-rating_count', '-updated_at', '-created_at')

        return queryset.distinct().order_by(*ordering)


@extend_schema(tags=['Public'], summary='Bitta usta profilini olish')
class PublicWorkerDetailView(generics.RetrieveAPIView):
    serializer_class = WorkerPublicDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return _public_worker_queryset()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        viewer = request.user
        if viewer.is_authenticated and viewer.pk != instance.user_id:
            cutoff = timezone.now() - timedelta(minutes=5)
            already_logged = WorkerProfileViewLog.objects.filter(
                worker=instance.user,
                viewer=viewer,
                viewed_at__gte=cutoff,
            ).exists()
            if not already_logged:
                viewer_name = (
                    (viewer.full_name or '').strip()
                    or (viewer.email or '').strip()
                    or (viewer.phone_number or '').strip()
                    or 'Foydalanuvchi'
                )
                WorkerProfileViewLog.objects.create(
                    worker=instance.user,
                    viewer=viewer,
                    viewer_name=viewer_name,
                )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


@extend_schema(tags=['Auth'], summary='Yangi foydalanuvchini ro`yxatdan o`tkazish')
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_register'


@extend_schema(tags=['Auth'], summary='Emailni 5 xonali kod orqali tasdiqlash')
class VerifyActivationView(generics.GenericAPIView):
    serializer_class = VerifyActivationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_verify_activation'

    @extend_schema(tags=['Auth'])
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'detail': 'Email muvaffaqiyatli tasdiqlandi. Endi tizimga kirishingiz mumkin.'},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=['Auth'], summary='Tasdiqlash kodini qayta yuborish')
class ResendActivationView(generics.GenericAPIView):
    serializer_class = ResendActivationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_resend_activation'

    @extend_schema(tags=['Auth'])
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'detail': 'Tasdiqlash kodi emailingizga qayta yuborildi.'},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=['Auth'], summary='Clerk session token orqali tizimga kirish')
class ClerkExchangeView(generics.GenericAPIView):
    serializer_class = ClerkExchangeSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'auth_login'

    def post(self, request, *args, **kwargs):
        token = _extract_bearer_token(request)
        if not token:
            raise AuthenticationFailed('Clerk token yuborilmadi.')

        claims = _decode_clerk_session_token(token)
        clerk_sub = str(claims.get('sub') or '').strip()
        if not clerk_sub:
            raise AuthenticationFailed('Clerk token ichida sub topilmadi.')

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payload_clerk_id = str(data.get('clerk_user_id') or '').strip()
        if payload_clerk_id and payload_clerk_id != clerk_sub:
            raise AuthenticationFailed('Clerk foydalanuvchi identifikatori mos emas.')

        user, phone_required, user_type_required = _upsert_user_from_clerk_payload(
            clerk_user_id=clerk_sub,
            email=data['email'],
            full_name=data.get('full_name', ''),
            phone_number=data.get('phone_number', ''),
            user_type=data.get('user_type', ''),
        )

        refresh = RefreshToken.for_user(user)
        payload = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user, context={'request': request}).data,
            'phone_required': phone_required,
            'user_type_required': user_type_required,
        }
        return Response(payload, status=status.HTTP_200_OK)


@extend_schema(tags=['Users'], summary='Joriy foydalanuvchi profilini ko`rish/yangilash/o`chirish')
class MeView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MeProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete']
    parser_classes = (parsers.JSONParser, parsers.FormParser, parsers.MultiPartParser)

    @extend_schema(tags=['Users'], summary='Joriy foydalanuvchi profilini olish')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(tags=['Users'], summary='Joriy foydalanuvchi profilini yangilash')
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(tags=['Users'], summary='Akkauntni o`chirish')
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response(
            {'detail': 'Akkaunt muvaffaqiyatli o`chirildi.'},
            status=status.HTTP_200_OK,
        )

    def get_object(self):
        return self.request.user


@extend_schema(tags=['Users'], summary='Usta profilini ko`rish/yangilash')
class WorkerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch']

    @extend_schema(tags=['Users'], summary='Usta profilini olish')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(tags=['Users'], summary='Usta profilini yangilash')
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    def get_object(self):
        return _worker_profile_for_user(self.request.user)


@extend_schema(tags=['Users'], summary='Ustaning xizmatlar ro`yxatini olish va yangi xizmat qo`shish')
class WorkerSkillListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkerSkillSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post']

    @extend_schema(tags=['Users'], summary='Ustaning xizmatlar ro`yxati')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(tags=['Users'], summary='Ustaga yangi xizmat qo`shish')
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def get_queryset(self):
        profile = _worker_profile_for_user(self.request.user)
        return WorkerSkill.objects.filter(profile=profile)

    def perform_create(self, serializer):
        profile = _worker_profile_for_user(self.request.user)
        serializer.save(profile=profile)


@extend_schema(tags=['Users'], summary='Usta xizmatini ko`rish, tahrirlash yoki o`chirish')
class WorkerSkillDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkerSkillSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete']

    @extend_schema(tags=['Users'], summary='Bitta xizmatni olish')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(tags=['Users'], summary='Xizmatni yangilash')
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(tags=['Users'], summary='Xizmatni o`chirish')
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

    def get_queryset(self):
        profile = _worker_profile_for_user(self.request.user)
        return WorkerSkill.objects.filter(profile=profile)


@extend_schema(tags=['Users'], summary='Usta uchun dashboard statistikasi', responses=WorkerDashboardSerializer)
class WorkerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Users'], summary='Usta dashboard ma`lumotlari')
    def get(self, request, *args, **kwargs):
        user = request.user
        profile = _worker_profile_for_user(user)
        skills = WorkerSkill.objects.filter(profile=profile)
        own_orders = JobOrder.objects.filter(client=user)
        profile_views = WorkerProfileViewLog.objects.filter(worker=user)
        skills_stats = skills.aggregate(
            skills_count=Count('id'),
            active_skills_count=Count('id', filter=Q(is_active=True)),
        )
        order_stats = own_orders.aggregate(
            open_orders_count=Count('id', filter=Q(status=ORDER_STATUS_CHOICES.open)),
            in_progress_orders_count=Count('id', filter=Q(status=ORDER_STATUS_CHOICES.in_progress)),
            completed_orders_count=Count('id', filter=Q(status=ORDER_STATUS_CHOICES.completed)),
        )

        completion_checks = [
            bool(user.full_name),
            bool(user.phone_number),
            bool(
                user.profile_photo
                and (user.profile_photo.name or '').rsplit('/', maxsplit=1)[-1] not in DEFAULT_PROFILE_FILENAMES
            ),
            bool(profile.specialization),
            bool(profile.service_city),
            bool(profile.about),
        ]
        completion_percent = int((sum(completion_checks) / len(completion_checks)) * 100)
        recent_profile_viewers = list(
            profile_views
            .exclude(viewer__isnull=True)
            .values('viewer_id', 'viewer_name', 'viewed_at')[:8]
        )
        profile_views_count = profile_views.count()

        data = {
            'profile': WorkerProfileSerializer(profile, context={'request': request}).data,
            'skills_count': skills_stats['skills_count'],
            'active_skills_count': skills_stats['active_skills_count'],
            'open_orders_count': order_stats['open_orders_count'],
            'in_progress_orders_count': order_stats['in_progress_orders_count'],
            'completed_orders_count': order_stats['completed_orders_count'],
            'profile_completion_percent': completion_percent,
            'profile_views_count': profile_views_count,
            'recent_profile_viewers': recent_profile_viewers,
        }

        return Response(data, status=status.HTTP_200_OK)
