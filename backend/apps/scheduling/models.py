"""Project scheduling and Gantt models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class ScheduleItemStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not Started"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    DELAYED = "delayed", "Delayed"
    ON_HOLD = "on_hold", "On Hold"


class DependencyType(models.TextChoices):
    FINISH_TO_START = "finish_to_start", "Finish to Start"
    START_TO_START = "start_to_start", "Start to Start"
    FINISH_TO_FINISH = "finish_to_finish", "Finish to Finish"
    START_TO_FINISH = "start_to_finish", "Start to Finish"


class SchedulePhase(TenantScopedModel):
    """Logical grouping for Gantt rows (e.g. Foundation, Structure)."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="schedule_phases",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="schedule_phases",
    )
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=16, default="#F97316")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        unique_together = [("project", "name")]

    def __str__(self):
        return f"{self.project.name} — {self.name}"


class ScheduleItem(TenantScopedModel):
    """A bar on the project Gantt chart."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="schedule_items",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="schedule_items",
    )
    phase = models.ForeignKey(
        SchedulePhase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(
        max_length=16,
        choices=ScheduleItemStatus.choices,
        default=ScheduleItemStatus.NOT_STARTED,
        db_index=True,
    )
    color = models.CharField(max_length=16, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_milestone = models.BooleanField(default=False)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedule_items",
    )
    linked_task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedule_items",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_schedule_items",
    )

    class Meta:
        ordering = ["sort_order", "start_date", "title"]
        indexes = [
            models.Index(fields=["company", "project", "start_date"]),
            models.Index(fields=["project", "status"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_date} → {self.end_date})"

    @property
    def duration_days(self) -> int:
        return max((self.end_date - self.start_date).days + 1, 1)


class ScheduleDependency(models.Model):
    """Directed dependency between two schedule items."""

    predecessor = models.ForeignKey(
        ScheduleItem,
        on_delete=models.CASCADE,
        related_name="successor_links",
    )
    successor = models.ForeignKey(
        ScheduleItem,
        on_delete=models.CASCADE,
        related_name="predecessor_links",
    )
    dependency_type = models.CharField(
        max_length=20,
        choices=DependencyType.choices,
        default=DependencyType.FINISH_TO_START,
    )
    lag_days = models.IntegerField(default=0)

    class Meta:
        unique_together = [("predecessor", "successor")]
        indexes = [
            models.Index(fields=["predecessor"]),
            models.Index(fields=["successor"]),
        ]

    def __str__(self):
        return f"{self.predecessor.title} → {self.successor.title}"
