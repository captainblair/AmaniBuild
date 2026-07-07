"""Projects domain models."""

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.core.models import TenantScopedModel


class ProjectStatus(models.TextChoices):
    PLANNING = "planning", "Planning"
    ACTIVE = "active", "Active"
    ON_HOLD = "on_hold", "On Hold"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class ProjectType(models.TextChoices):
    RESIDENTIAL = "residential", "Residential"
    COMMERCIAL = "commercial", "Commercial"
    INDUSTRIAL = "industrial", "Industrial"
    INFRASTRUCTURE = "infrastructure", "Infrastructure"
    MIXED_USE = "mixed_use", "Mixed Use"
    RENOVATION = "renovation", "Renovation"


class Project(TenantScopedModel):
    """Construction project — primary entity for portfolio and site operations."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="projects",
    )
    site = models.ForeignKey(
        "companies.Site",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, blank=True)

    project_type = models.CharField(
        max_length=32,
        choices=ProjectType.choices,
        default=ProjectType.RESIDENTIAL,
    )
    status = models.CharField(
        max_length=32,
        choices=ProjectStatus.choices,
        default=ProjectStatus.PLANNING,
    )
    description = models.TextField(blank=True)

    client_name = models.CharField(max_length=255, blank=True)
    client_email = models.EmailField(blank=True)
    client_phone = models.CharField(max_length=20, blank=True)

    budget_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    budget_spent = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="KES")

    planned_start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    actual_start_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)

    progress_percent = models.PositiveSmallIntegerField(default=0)
    project_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_projects",
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("company", "code")]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "slug"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.company.name})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "project"
            slug = base
            counter = 1
            while (
                Project.all_objects.filter(company=self.company, slug=slug)
                .exclude(pk=self.pk)
                .exists()
            ):
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def budget_remaining(self):
        return max(self.budget_total - self.budget_spent, 0)

    @property
    def budget_utilization_percent(self) -> float:
        if not self.budget_total:
            return 0.0
        return round(float(self.budget_spent / self.budget_total) * 100, 1)
