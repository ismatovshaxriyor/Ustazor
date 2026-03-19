from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, parsers, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder
from apps.reviews.models import WorkerPortfolio, WorkerReview
from apps.reviews.serializers import (
    WorkerPortfolioCreateSerializer,
    WorkerPortfolioPublicSerializer,
    WorkerReviewCreateSerializer,
    WorkerReviewPublicSerializer,
)


def _require_worker_user(user):
    if user.user_type != USER_TYPE_CHOICES.worker:
        raise PermissionDenied("Bu endpoint faqat usta akkaunti uchun.")


@extend_schema(tags=['Reviews'], summary='Mijoz yakunlangan e`lon uchun ustaga baho beradi')
class OrderReviewCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.JSONParser, parsers.FormParser, parsers.MultiPartParser)

    @extend_schema(
        tags=['Reviews'],
        request=WorkerReviewCreateSerializer,
        responses=WorkerReviewPublicSerializer,
    )
    def post(self, request, order_id, *args, **kwargs):
        order = get_object_or_404(
            JobOrder.objects.select_related('client', 'assigned_worker'),
            pk=order_id,
            client=request.user,
        )
        serializer = WorkerReviewCreateSerializer(
            data=request.data,
            context={'request': request, 'order': order},
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        output = WorkerReviewPublicSerializer(review, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Reviews'], summary='Ustaga berilgan baholar ro`yxati (public)')
class PublicWorkerReviewListView(generics.ListAPIView):
    serializer_class = WorkerReviewPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            WorkerReview.objects
            .select_related('client', 'worker', 'order')
            .prefetch_related('images')
            .filter(worker_id=self.kwargs['worker_id'])
            .order_by('-created_at')
        )


@extend_schema(tags=['Reviews'], summary='Ustaning portfolio ishlari ro`yxati (public)')
class PublicWorkerPortfolioListView(generics.ListAPIView):
    serializer_class = WorkerPortfolioPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            WorkerPortfolio.objects
            .prefetch_related('images')
            .filter(
                worker_id=self.kwargs['worker_id'],
                worker__is_active=True,
                worker__is_verified=True,
                worker__user_type=USER_TYPE_CHOICES.worker,
            )
            .order_by('-is_featured', '-created_at')
        )


@extend_schema(tags=['Reviews'], summary='Ustaning portfolio ishlari (list/create)')
class MyPortfolioListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkerPortfolioCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.JSONParser, parsers.FormParser, parsers.MultiPartParser)
    http_method_names = ['get', 'post']

    def get_queryset(self):
        _require_worker_user(self.request.user)
        return WorkerPortfolio.objects.prefetch_related('images').filter(worker=self.request.user)

    def perform_create(self, serializer):
        _require_worker_user(self.request.user)
        serializer.save()


@extend_schema(tags=['Reviews'], summary='Portfolio ishini ko`rish/tahrirlash/o`chirish')
class MyPortfolioDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.JSONParser, parsers.FormParser, parsers.MultiPartParser)
    http_method_names = ['get', 'patch', 'delete']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return WorkerPortfolioPublicSerializer
        return WorkerPortfolioCreateSerializer

    def get_queryset(self):
        _require_worker_user(self.request.user)
        return WorkerPortfolio.objects.prefetch_related('images').filter(worker=self.request.user)
