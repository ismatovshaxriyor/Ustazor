from drf_spectacular.utils import extend_schema
from django.db.models import Prefetch, Q
from rest_framework import generics, parsers, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from apps.accounts.serializers import (
    CustomTokenObtainPairSerializer,
    MeProfileSerializer,
    WorkerPublicDetailSerializer,
    WorkerPublicListSerializer,
    RegisterSerializer,
    ResendActivationSerializer,
    VerifyActivationSerializer,
    WorkerDashboardSerializer,
    WorkerProfileSerializer,
    WorkerSkillSerializer,
)
from apps.accounts.models import USER_TYPE_CHOICES, WorkerProfile, WorkerSkill
from apps.jobs.models import ORDER_STATUS_CHOICES, JobOrder


def _worker_profile_for_user(user):
    if user.user_type != USER_TYPE_CHOICES.worker:
        raise PermissionDenied("Bu endpoint faqat ustalar uchun.")
    profile, _ = WorkerProfile.objects.get_or_create(user=user)
    return profile


@extend_schema(tags=['Auth'], summary='Tizimga kirish (JWT token olish)')
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


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
    return WorkerProfile.objects.select_related('user').prefetch_related(active_skills_prefetch).filter(
        user__is_active=True,
        user__is_verified=True,
        user__user_type=USER_TYPE_CHOICES.worker,
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

        return queryset.distinct().order_by('-updated_at', '-created_at')


@extend_schema(tags=['Public'], summary='Bitta usta profilini olish')
class PublicWorkerDetailView(generics.RetrieveAPIView):
    serializer_class = WorkerPublicDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return _public_worker_queryset()


@extend_schema(tags=['Auth'], summary='Yangi foydalanuvchini ro`yxatdan o`tkazish')
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


@extend_schema(tags=['Auth'], summary='Emailni 5 xonali kod orqali tasdiqlash')
class VerifyActivationView(generics.GenericAPIView):
    serializer_class = VerifyActivationSerializer
    permission_classes = [permissions.AllowAny]

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

    @extend_schema(tags=['Auth'])
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'detail': 'Tasdiqlash kodi emailingizga qayta yuborildi.'},
            status=status.HTTP_200_OK,
        )


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

        completion_checks = [
            bool(user.full_name),
            bool(user.phone_number),
            bool(user.profile_photo and user.profile_photo.name not in {'default_user.png', '/default_user.png'}),
            bool(profile.specialization),
            bool(profile.service_city),
            bool(profile.about),
        ]
        completion_percent = int((sum(completion_checks) / len(completion_checks)) * 100)

        data = {
            'profile': WorkerProfileSerializer(profile, context={'request': request}).data,
            'skills_count': skills.count(),
            'active_skills_count': skills.filter(is_active=True).count(),
            'open_orders_count': own_orders.filter(status=ORDER_STATUS_CHOICES.open).count(),
            'in_progress_orders_count': own_orders.filter(status=ORDER_STATUS_CHOICES.in_progress).count(),
            'completed_orders_count': own_orders.filter(status=ORDER_STATUS_CHOICES.completed).count(),
            'profile_completion_percent': completion_percent,
        }

        return Response(data, status=status.HTTP_200_OK)
