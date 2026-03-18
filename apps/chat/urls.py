from django.urls import path

from apps.chat.views import (
    ChatAcceptWorkerView,
    ChatMessageListCreateView,
    ChatRejectWorkerView,
    ChatThreadListView,
)

urlpatterns = [
    path('threads/', ChatThreadListView.as_view(), name='chat_thread_list'),
    path('threads/<int:thread_id>/messages/', ChatMessageListCreateView.as_view(), name='chat_message_list_create'),
    path('threads/<int:thread_id>/accept-worker/', ChatAcceptWorkerView.as_view(), name='chat_accept_worker'),
    path('threads/<int:thread_id>/reject-worker/', ChatRejectWorkerView.as_view(), name='chat_reject_worker'),
]
