"""Procurement and purchase request models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class PurchaseCategory(models.TextChoices):
    MATERIALS = "materials", "Materials"
    EQUIPMENT = "equipment", "Equipment"
    SERVICES = "services", "Services"
    TRANSPORT = "transport", "Transport"
    OTHER = "other", "Other"


class PurchaseRequestStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_MANAGER = "pending_manager", "Pending Manager Review"
    PENDING_OWNER = "pending_owner", "Pending Owner Approval"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class ApprovalStepType(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    MANAGER_REVIEW = "manager_review", "Manager Review"
    OWNER_APPROVAL = "owner_approval", "Owner Approval"


class ApprovalStepStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    REJECTED = "rejected", "Rejected"
    SKIPPED = "skipped", "Skipped"


class PurchaseRequest(TenantScopedModel):
    """Purchase request / PO approval workflow."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="purchase_requests",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="purchase_requests",
    )
    request_number = models.CharField(max_length=32, db_index=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=32, choices=PurchaseCategory.choices, default=PurchaseCategory.MATERIALS)
    justification = models.TextField(blank=True)
    status = models.CharField(
        max_length=32,
        choices=PurchaseRequestStatus.choices,
        default=PurchaseRequestStatus.DRAFT,
    )
    currency = models.CharField(max_length=3, default="KES")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchase_requests_created",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    attachments = models.JSONField(default=list, blank=True)
    supplier_quotes = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("company", "request_number")]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["project", "status"]),
        ]

    def __str__(self):
        return f"{self.request_number} — {self.title}"


class PurchaseRequestLine(models.Model):
    """Line item on a purchase request."""

    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit = models.CharField(max_length=32, default="unit")
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} ({self.amount})"


class PurchaseApprovalStep(models.Model):
    """Approval workflow step for a purchase request."""

    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name="approval_steps",
    )
    step_type = models.CharField(max_length=32, choices=ApprovalStepType.choices)
    status = models.CharField(max_length=16, choices=ApprovalStepStatus.choices, default=ApprovalStepStatus.PENDING)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_purchase_approvals",
    )
    acted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acted_purchase_approvals",
    )
    acted_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]
        unique_together = [("request", "step_type")]

    def __str__(self):
        return f"{self.request.request_number} — {self.step_type} ({self.status})"
