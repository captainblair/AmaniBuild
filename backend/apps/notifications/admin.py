from django.contrib import admin

from apps.notifications.models import ActivityEvent, Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "recipient",
        "company",
        "category",
        "priority",
        "is_read",
        "created_at",
    )
    list_filter = ("category", "priority", "is_read")
    search_fields = ("title", "body", "recipient__email", "company__name")


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    list_display = ("title", "event_type", "company", "project", "occurred_at", "actor")
    list_filter = ("event_type",)
    search_fields = ("title", "summary", "company__name")
