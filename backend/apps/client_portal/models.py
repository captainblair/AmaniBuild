"""Client portal access and sharing models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class ClientProjectAccess(TenantScopedModel):
    """Grants a client user read-only access to a specific project."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="client_project_access",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="client_access_grants",
    )
    client_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_project_access",
    )
    can_view_budget = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_client_access",
    )

    class Meta:
        unique_together = [("project", "client_user")]
        indexes = [
            models.Index(fields=["company", "client_user", "is_active"]),
            models.Index(fields=["project", "is_active"]),
        ]

    def __str__(self):
        return f"{self.client_user.email} → {self.project.name}"
