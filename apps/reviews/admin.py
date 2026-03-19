from django.contrib import admin

from apps.reviews.models import (
    WorkerPortfolio,
    WorkerPortfolioImage,
    WorkerReview,
    WorkerReviewImage,
)


class WorkerReviewImageInline(admin.TabularInline):
    model = WorkerReviewImage
    extra = 0
    fields = ('image', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(WorkerReview)
class WorkerReviewAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order',
        'client',
        'worker',
        'rating',
        'created_at',
    )
    list_filter = ('rating', 'created_at')
    search_fields = (
        'order__title',
        'client__full_name',
        'client__email',
        'worker__full_name',
        'worker__email',
        'comment',
    )
    autocomplete_fields = ('order', 'client', 'worker')
    inlines = (WorkerReviewImageInline,)
    ordering = ('-created_at',)


class WorkerPortfolioImageInline(admin.TabularInline):
    model = WorkerPortfolioImage
    extra = 0
    fields = ('image', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(WorkerPortfolio)
class WorkerPortfolioAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'worker',
        'location',
        'completed_at',
        'is_featured',
        'created_at',
    )
    list_filter = ('is_featured', 'completed_at', 'created_at')
    search_fields = ('title', 'description', 'location', 'worker__full_name', 'worker__email')
    autocomplete_fields = ('worker',)
    inlines = (WorkerPortfolioImageInline,)
    ordering = ('-is_featured', '-created_at')
