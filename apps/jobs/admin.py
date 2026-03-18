from django.contrib import admin

from apps.jobs.models import JobOrder


@admin.register(JobOrder)
class JobOrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'client',
        'price_type',
        'price_amount',
        'status',
        'city',
        'created_at',
    )
    list_filter = ('price_type', 'status', 'city', 'created_at')
    search_fields = ('title', 'description', 'city', 'address', 'client__email', 'client__full_name')
    autocomplete_fields = ('client', 'assigned_worker')
    ordering = ('-created_at',)
