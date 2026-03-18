from django.contrib import admin

from apps.proposals.models import VacancyProposal


@admin.register(VacancyProposal)
class VacancyProposalAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'vacancy',
        'worker',
        'status',
        'proposed_price',
        'created_at',
    )
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = (
        'vacancy__title',
        'vacancy__client__full_name',
        'vacancy__client__email',
        'worker__full_name',
        'worker__email',
        'cover_letter',
    )
    autocomplete_fields = ('vacancy', 'worker')
