"""Notification and activity feed models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class NotificationCategory(models.TextChoices):
    CRITICAL = "critical", "Critical"
    APPROVAL = "approval", "Approval"
    INVENTORY = "inventory", "Inventory"
    MENTION = "mention", "Mention"
    GENERAL = "general", "General"


class NotificationPriority(models.TextChoices):
    HIGH = "high", "High"
    MEDIUM = "medium", "Medium"
    LOW = "low", "Low"


class ActivityEventType(models.TextChoices):
    ATTENDANCE = "attendance", "Attendance"
    DIARY = "diary", "Site Diary"
    PROCUREMENT = "procurement", "Procurement"
    INVENTORY = "inventory", "Inventory"
    TASK = "task", "Task"
    DOCUMENT = "document", "Document"
    BUDGET = "budget", "Budget"
    SYSTEM = "system", "System"


class Notification(TenantScopedModel):
    """User-specific alert shown in the notifications center."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="triggered_notifications",
    )
    category = models.CharField(
        max_length=16,
        choices=NotificationCategory.choices,
        default=NotificationCategory.GENERAL,
        db_index=True,
    )
    priority = models.CharField(
        max_length=16,
        choices=NotificationPriority.choices,
        default=NotificationPriority.MEDIUM,
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    action_label = models.CharField(max_length=100, blank=True)
    action_url = models.CharField(max_length=500, blank=True)
    source_type = models.CharField(max_length=50, blank=True)
    source_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "recipient", "is_read"]),
            models.Index(fields=["company", "category", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
        ]

    def __str__(self):
        return f"{self.title} → {self.recipient_id}"


class ActivityEvent(TenantScopedModel):
    """Company activity stream entry for the timeline panel."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="activity_events",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_events",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_events",
    )
    event_type = models.CharField(max_length=32, choices=ActivityEventType.choices, db_index=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    occurred_at = models.DateTimeField(db_index=True)
    source_type = models.CharField(max_length=50, blank=True)
    source_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-occurred_at", "-created_at"]
        indexes = [
            models.Index(fields=["company", "occurred_at"]),
            models.Index(fields=["company", "event_type", "occurred_at"]),
            models.Index(fields=["project", "occurred_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.event_type})"
