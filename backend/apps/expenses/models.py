"""Expense logging and receipt models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class ExpenseCategory(models.TextChoices):
    MATERIALS = "materials", "Materials"
    LABOUR = "labour", "Labour"
    TRANSPORT = "transport", "Transport"
    FUEL = "fuel", "Fuel"
    MEALS = "meals", "Meals & Subsistence"
    EQUIPMENT = "equipment", "Equipment Hire"
    UTILITIES = "utilities", "Utilities"
    SUBCONTRACTOR = "subcontractor", "Subcontractor"
    OTHER = "other", "Other"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    MPESA = "mpesa", "M-Pesa"
    BANK_TRANSFER = "bank_transfer", "Bank Transfer"
    CARD = "card", "Card"
    OTHER = "other", "Other"


class ExpenseStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    REIMBURSED = "reimbursed", "Reimbursed"


class Expense(TenantScopedModel):
    """Project expense with receipt attachments."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    expense_number = models.CharField(max_length=32, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=32,
        choices=ExpenseCategory.choices,
        default=ExpenseCategory.OTHER,
        db_index=True,
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="KES")
    expense_date = models.DateField(db_index=True)
    vendor_name = models.CharField(max_length=255, blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    reference_number = models.CharField(max_length=64, blank=True)
    status = models.CharField(
        max_length=16,
        choices=ExpenseStatus.choices,
        default=ExpenseStatus.DRAFT,
        db_index=True,
    )
    receipt_photos = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="recorded_expenses",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_expenses",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    reimbursed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-expense_date", "-created_at"]
        unique_together = [("company", "expense_number")]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "category"]),
            models.Index(fields=["project", "expense_date"]),
        ]

    def __str__(self):
        return f"{self.expense_number} — {self.title}"

    @property
    def total_amount(self):
        return self.amount + self.tax_amount

    @property
    def receipt_count(self) -> int:
        return len(self.receipt_photos or [])
