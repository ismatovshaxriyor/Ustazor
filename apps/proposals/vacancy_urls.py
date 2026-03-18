from django.urls import path

from apps.proposals.views import VacancyProposalCreateView

urlpatterns = [
    path('<int:vacancy_id>/apply/', VacancyProposalCreateView.as_view(), name='vacancy_apply'),
]
