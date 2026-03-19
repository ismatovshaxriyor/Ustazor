from drf_spectacular.utils import extend_schema
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES
from apps.jobs.serializers import JobOrderSerializer, PublicJobOrderSerializer


@extend_schema(tags=['Orders'], summary='Mening buyurtmalarim ro`yxati va yangi buyurtma yaratish')
class JobOrderListCreateView(generics.ListCreateAPIView):
    serializer_class = JobOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = JobOrder.objects.filter(client=self.request.user).select_related('client', 'assigned_worker')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)


@extend_schema(tags=['Orders'], summary='Mening buyurtmamni ko`rish, tahrirlash yoki o`chirish')
class JobOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JobOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete']

    def get_queryset(self):
        return JobOrder.objects.filter(client=self.request.user).select_related('client', 'assigned_worker')


@extend_schema(tags=['Orders'], summary='Mijoz e`lonni yakunlangan holatga o`tkazadi')
class JobOrderCloseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Orders'], responses=JobOrderSerializer)
    def post(self, request, pk, *args, **kwargs):
        order = JobOrder.objects.select_related('client', 'assigned_worker').filter(
            pk=pk,
            client=request.user,
        ).first()
        if order is None:
            raise NotFound("E`lon topilmadi.")

        if order.status == ORDER_STATUS_CHOICES.completed:
            payload = JobOrderSerializer(order, context={'request': request}).data
            return Response(payload, status=status.HTTP_200_OK)

        if not order.assigned_worker_id:
            raise ValidationError("Usta biriktirilmagan e`lonni yakunlab bo`lmaydi.")

        if order.status not in {ORDER_STATUS_CHOICES.in_progress, ORDER_STATUS_CHOICES.open}:
            raise ValidationError("Faqat ochiq yoki jarayondagi e`lonni yopish mumkin.")

        order.status = ORDER_STATUS_CHOICES.completed
        order.save(update_fields=['status', 'updated_at'])

        payload = JobOrderSerializer(order, context={'request': request}).data
        return Response(payload, status=status.HTTP_200_OK)


@extend_schema(tags=['Public'], summary='Vakansiyalar ro`yxatini olish va qidirish')
class PublicJobOrderListView(generics.ListAPIView):
    serializer_class = PublicJobOrderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = JobOrder.objects.filter(status=ORDER_STATUS_CHOICES.open).select_related('client')

        query = (self.request.query_params.get('q') or '').strip()
        category = (self.request.query_params.get('category') or '').strip()
        city = (self.request.query_params.get('city') or '').strip()
        price_type = (self.request.query_params.get('price_type') or '').strip()

        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(category__icontains=query)
                | Q(city__icontains=query)
                | Q(address__icontains=query)
            )

        if category:
            queryset = queryset.filter(category__icontains=category)

        if city:
            queryset = queryset.filter(city__icontains=city)

        if price_type:
            queryset = queryset.filter(price_type=price_type)

        return queryset.order_by('-created_at')


@extend_schema(tags=['Public'], summary='Bitta vakansiya ma`lumotini olish')
class PublicJobOrderDetailView(generics.RetrieveAPIView):
    serializer_class = PublicJobOrderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        visibility_filter = Q(status=ORDER_STATUS_CHOICES.open)

        user = self.request.user
        if user and user.is_authenticated:
            visibility_filter |= Q(client=user) | Q(assigned_worker=user)

        return JobOrder.objects.filter(visibility_filter).select_related('client').distinct()

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_field = self.lookup_field
        lookup_url_kwarg = self.lookup_url_kwarg or lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        obj = queryset.filter(**{lookup_field: lookup_value}).first()
        if obj is None:
            raise NotFound("E`lon topilmadi yoki siz uchun yopiq.")
        return obj
