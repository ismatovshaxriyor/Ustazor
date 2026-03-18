from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.accounts.views import (
    CustomTokenBlacklistView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    CustomTokenVerifyView,
)
from config.spectacular_view import CustomSwaggerView

for model in (OutstandingToken, BlacklistedToken):
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/', include('apps.accounts.urls')),
    path('api/workers/', include('apps.accounts.public_urls')),
    path('api/orders/', include('apps.jobs.urls')),
    path('api/vacancies/', include('apps.jobs.public_urls')),
    path('api/vacancies/', include('apps.proposals.vacancy_urls')),
    path('api/proposals/', include('apps.proposals.urls')),

    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', CustomTokenVerifyView.as_view(), name='token_verify'),
    path('api/token/logout/', CustomTokenBlacklistView.as_view(), name='token_blacklist'),

    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("", CustomSwaggerView.as_view(), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
