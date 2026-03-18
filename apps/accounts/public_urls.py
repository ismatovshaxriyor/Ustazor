from django.urls import path

from apps.accounts.views import PublicWorkerDetailView, PublicWorkerListView

urlpatterns = [
    path('', PublicWorkerListView.as_view(), name='public_worker_list'),
    path('<int:pk>/', PublicWorkerDetailView.as_view(), name='public_worker_detail'),
]
