from django.urls import path

from apps.jobs.views import JobOrderDetailView, JobOrderListCreateView

urlpatterns = [
    path('', JobOrderListCreateView.as_view(), name='order_list_create'),
    path('<int:pk>/', JobOrderDetailView.as_view(), name='order_detail'),
]
