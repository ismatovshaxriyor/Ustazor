from django.urls import path

from apps.accounts.views import (
    ClerkExchangeView,
    CustomTokenObtainPairView,
    MeView,
    RegisterView,
    ResendActivationView,
    VerifyActivationView,
    WorkerDashboardView,
    WorkerProfileView,
    WorkerSkillDetailView,
    WorkerSkillListCreateView,
)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('clerk/exchange/', ClerkExchangeView.as_view(), name='clerk_exchange'),
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyActivationView.as_view(), name='verify_email'),
    path('resend-activation/', ResendActivationView.as_view(), name='resend_activation'),
    path('me/', MeView.as_view(), name='me'),
    path('worker-profile/', WorkerProfileView.as_view(), name='worker_profile'),
    path('worker-skills/', WorkerSkillListCreateView.as_view(), name='worker_skill_list_create'),
    path('worker-skills/<int:pk>/', WorkerSkillDetailView.as_view(), name='worker_skill_detail'),
    path('worker-dashboard/', WorkerDashboardView.as_view(), name='worker_dashboard'),
]
