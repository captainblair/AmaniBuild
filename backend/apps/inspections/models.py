"""Quality assurance and site inspection models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class InspectionType(models.TextChoices):
    GENERAL = "general", "General QA"
    STRUCTURAL = "structural", "Structural"
    ELECTRICAL = "electrical", "Electrical"
    PLUMBING = "plumbing", "Plumbing"
    FINISHING = "finishing", "Finishing"
    SAFETY = "safety", "Safety"
    MEP = "mep", "MEP"
    OTHER = "other", "Other"


class InspectionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SCHEDULED = "scheduled", "Scheduled"
    IN_PROGRESS = "in_progress", "In Progress"
    SUBMITTED = "submitted", "Submitted"
    PASSED = "passed", "Passed"
    FAILED = "failed", "Failed"


class InspectionResult(models.TextChoices):
    PASS = "pass", "Pass"
    FAIL = "fail", "Fail"
    CONDITIONAL_PASS = "conditional_pass", "Conditional Pass"


class Inspection(TenantScopedModel):
    """Site quality inspection with checklist and findings."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="inspections",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="inspections",
    )
    inspection_number = models.CharField(max_length=32, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    inspection_type = models.CharField(
        max_length=32,
        choices=InspectionType.choices,
        default=InspectionType.GENERAL,
        db_index=True,
    )
    area_location = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=16,
        choices=InspectionStatus.choices,
        default=InspectionStatus.DRAFT,
        db_index=True,
    )
    result = models.CharField(
        max_length=20,
        choices=InspectionResult.choices,
        null=True,
        blank=True,
    )
    score_percent = models.PositiveSmallIntegerField(default=0)
    checklist_items = models.JSONField(default=list, blank=True)
    findings = models.JSONField(default=list, blank=True)
    photos = models.JSONField(default=list, blank=True)
    scheduled_date = models.DateField(null=True, blank=True)
    inspected_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    inspector = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_inspections",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_inspections",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_inspections",
    )

    class Meta:
        ordering = ["-scheduled_date", "-created_at"]
        unique_together = [("company", "inspection_number")]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "inspection_type"]),
            models.Index(fields=["project", "status"]),
        ]

    def __str__(self):
        return f"{self.inspection_number} — {self.title}"

    @property
    def open_findings_count(self) -> int:
        return sum(1 for item in (self.findings or []) if not item.get("resolved"))

    @property
    def failed_checklist_count(self) -> int:
        return sum(1 for item in (self.checklist_items or []) if item.get("status") == "fail")
