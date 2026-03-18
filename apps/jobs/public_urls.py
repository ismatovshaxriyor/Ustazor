from django.urls import path

from apps.jobs.views import PublicJobOrderDetailView, PublicJobOrderListView

urlpatterns = [
    path('', PublicJobOrderListView.as_view(), name='public_vacancy_list'),
    path('<int:pk>/', PublicJobOrderDetailView.as_view(), name='public_vacancy_detail'),
]
