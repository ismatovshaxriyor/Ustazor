from django.contrib import admin

from apps.chat.models import ChatMessage, ChatThread


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'vacancy',
        'client',
        'worker',
        'updated_at',
    )
    search_fields = (
        'vacancy__title',
        'client__full_name',
        'client__email',
        'worker__full_name',
        'worker__email',
    )
    autocomplete_fields = ('vacancy', 'client', 'worker')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'thread',
        'sender',
        'is_system',
        'visibility',
        'created_at',
    )
    list_filter = ('is_system', 'visibility', 'created_at')
    search_fields = ('thread__vacancy__title', 'sender__full_name', 'sender__email', 'body')
    autocomplete_fields = ('thread', 'sender')
