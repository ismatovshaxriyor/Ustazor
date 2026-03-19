from django.urls import path

from apps.reviews.views import (
    MyPortfolioDetailView,
    MyPortfolioListCreateView,
    OrderReviewCreateView,
    PublicWorkerPortfolioListView,
    PublicWorkerReviewListView,
)

urlpatterns = [
    path('orders/<int:order_id>/', OrderReviewCreateView.as_view(), name='order_review_create'),
    path('workers/<int:worker_id>/', PublicWorkerReviewListView.as_view(), name='public_worker_reviews'),
    path('portfolio/workers/<int:worker_id>/', PublicWorkerPortfolioListView.as_view(), name='public_worker_portfolio'),
    path('portfolio/my/', MyPortfolioListCreateView.as_view(), name='my_portfolio_list_create'),
    path('portfolio/my/<int:pk>/', MyPortfolioDetailView.as_view(), name='my_portfolio_detail'),
]
