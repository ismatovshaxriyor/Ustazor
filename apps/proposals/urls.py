from django.urls import path

from apps.proposals.views import (
    MyProposalListView,
    ProposalStatusUpdateView,
    ReceivedProposalListView,
)

urlpatterns = [
    path('my/', MyProposalListView.as_view(), name='my_proposals'),
    path('received/', ReceivedProposalListView.as_view(), name='received_proposals'),
    path('<int:pk>/status/', ProposalStatusUpdateView.as_view(), name='proposal_status_update'),
]
