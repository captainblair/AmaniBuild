"""Daily site diary models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class DiaryEntryStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"


class WeatherCondition(models.TextChoices):
    SUNNY = "sunny", "Sunny"
    PARTLY_CLOUDY = "partly_cloudy", "Partly Cloudy"
    CLOUDY = "cloudy", "Cloudy"
    RAINY = "rainy", "Rainy"
    EXTREME = "extreme", "Extreme"


class SiteDiaryEntry(TenantScopedModel):
    """Daily construction site diary for a project."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="diary_entries",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="diary_entries",
    )
    entry_date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=16,
        choices=DiaryEntryStatus.choices,
        default=DiaryEntryStatus.DRAFT,
    )

    weather_condition = models.CharField(
        max_length=32,
        choices=WeatherCondition.choices,
        default=WeatherCondition.PARTLY_CLOUDY,
    )
    weather_temperature_c = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
    )
    weather_humidity_percent = models.PositiveSmallIntegerField(null=True, blank=True)
    weather_wind = models.CharField(max_length=100, blank=True)

    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supervised_diary_entries",
    )
    workforce_count = models.PositiveIntegerField(default=0)
    working_hours = models.DecimalField(max_digits=4, decimal_places=1, default=8)

    work_description = models.TextField(blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    milestones = models.JSONField(default=list, blank=True)
    labour_activities = models.JSONField(default=list, blank=True)
    equipment_used = models.JSONField(default=list, blank=True)
    materials_consumed = models.JSONField(default=list, blank=True)

    delays = models.TextField(blank=True)
    safety_concerns = models.TextField(blank=True)
    required_actions = models.TextField(blank=True)
    action_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_diary_actions",
    )
    site_conditions_notes = models.TextField(blank=True)

    photos = models.JSONField(default=list, blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_diary_entries",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_diary_entries",
    )

    class Meta:
        ordering = ["-entry_date", "-created_at"]
        unique_together = [("project", "entry_date")]
        indexes = [
            models.Index(fields=["company", "project", "entry_date"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self):
        return f"{self.project.name} — {self.entry_date}"

    @property
    def has_issues(self) -> bool:
        return bool(self.delays.strip() or self.safety_concerns.strip() or self.required_actions.strip())

    @property
    def photo_count(self) -> int:
        return len(self.photos or [])

    @property
    def materials_count(self) -> int:
        return len(self.materials_consumed or [])
