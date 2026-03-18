from drf_spectacular.utils import extend_schema
from django.db.models import Q
from rest_framework import generics, permissions

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
        return JobOrder.objects.filter(status=ORDER_STATUS_CHOICES.open).select_related('client')
