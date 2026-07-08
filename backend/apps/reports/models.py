"""Reports and analytics models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class ReportType(models.TextChoices):
    PROGRESS = "progress", "Progress Report"
    COST_VARIANCE = "cost_variance", "Cost Variance Report"
    ATTENDANCE_PAYROLL = "attendance_payroll", "Attendance Payroll Export"
    MATERIAL_USAGE = "material_usage", "Material Usage Report"
    DIARY_SUMMARY = "diary_summary", "Diary Summary PDF"
    BUDGET_VS_ACTUAL = "budget_vs_actual", "Budget vs Actual"
    SAFETY_INCIDENTS = "safety_incidents", "Safety Incidents"
    CUSTOM = "custom", "Custom Report Builder"


class GeneratedReport(TenantScopedModel):
    """Saved generated report metadata and payload snapshot."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="generated_reports",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_reports",
    )
    report_type = models.CharField(max_length=32, choices=ReportType.choices, db_index=True)
    title = models.CharField(max_length=255)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="generated_reports",
    )
    date_from = models.DateField(null=True, blank=True)
    date_to = models.DateField(null=True, blank=True)
    output_format = models.CharField(max_length=16, default="json")
    status = models.CharField(max_length=16, default="ready")
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "report_type"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["project", "created_at"]),
        ]

    def __str__(self):
        return self.title

