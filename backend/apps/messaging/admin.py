from django.contrib import admin

from apps.messaging.models import ChatMessage, ConversationChannel, ConversationMember


@admin.register(ConversationChannel)
class ConversationChannelAdmin(admin.ModelAdmin):
    list_display = ("name", "channel_type", "company", "project", "is_archived", "created_at")
    list_filter = ("channel_type", "is_archived")
    search_fields = ("name", "company__name", "project__name")


@admin.register(ConversationMember)
class ConversationMemberAdmin(admin.ModelAdmin):
    list_display = ("channel", "user", "last_read_at", "is_muted")
    search_fields = ("channel__name", "user__email")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("channel", "author", "is_pinned", "is_announcement", "created_at")
    search_fields = ("body", "channel__name", "author__email")
