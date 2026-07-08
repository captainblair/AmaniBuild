"""Expense business logic."""

from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Max, Q, Sum
from django.utils import timezone

from apps.companies.models import Company
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.services import get_project_for_company
from apps.expenses.models import Expense, ExpenseCategory, ExpenseStatus
from apps.projects.models import Project


def generate_expense_number(company: Company) -> str:
    year = timezone.localdate().year
    prefix = f"EXP-{year}-"
    latest = (
        Expense.all_objects.filter(company=company, expense_number__startswith=prefix)
        .aggregate(max_num=Max("expense_number"))
        .get("max_num")
    )
    if latest:
        try:
            seq = int(latest.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def assert_editable(expense: Expense) -> None:
    if expense.status not in (ExpenseStatus.DRAFT, ExpenseStatus.REJECTED):
        raise AmaniBuildAPIException(
            "Only draft or rejected expenses can be edited.",
            code="invalid_status",
        )


@transaction.atomic
def create_expense(*, company: Company, project: Project, user, data: dict) -> Expense:
    project = get_project_for_company(company, project.id)
    return Expense.objects.create(
        company=company,
        project=project,
        expense_number=generate_expense_number(company),
        title=data["title"],
        description=data.get("description", ""),
        category=data.get("category", ExpenseCategory.OTHER),
        amount=data["amount"],
        tax_amount=data.get("tax_amount", Decimal("0")),
        currency=data.get("currency", "KES"),
        expense_date=data["expense_date"],
        vendor_name=data.get("vendor_name", ""),
        payment_method=data.get("payment_method", "cash"),
        reference_number=data.get("reference_number", ""),
        receipt_photos=data.get("receipt_photos", []),
        notes=data.get("notes", ""),
        recorded_by=user,
    )


@transaction.atomic
def update_expense(expense: Expense, data: dict) -> Expense:
    assert_editable(expense)

    for field in (
        "title",
        "description",
        "category",
        "amount",
        "tax_amount",
        "currency",
        "expense_date",
        "vendor_name",
        "payment_method",
        "reference_number",
        "receipt_photos",
        "notes",
    ):
        if field in data:
            setattr(expense, field, data[field])

    if expense.status == ExpenseStatus.REJECTED:
        expense.status = ExpenseStatus.DRAFT
        expense.rejected_at = None
        expense.rejection_reason = ""

    expense.save()
    return expense


def submit_expense(expense: Expense) -> Expense:
    if expense.status not in (ExpenseStatus.DRAFT, ExpenseStatus.REJECTED):
        raise AmaniBuildAPIException("Only draft or rejected expenses can be submitted.", code="invalid_status")
    if not expense.receipt_photos:
        raise AmaniBuildAPIException(
            "At least one receipt photo is required before submission.",
            code="missing_receipt",
        )
    expense.status = ExpenseStatus.SUBMITTED
    expense.submitted_at = timezone.now()
    expense.rejected_at = None
    expense.rejection_reason = ""
    expense.save(update_fields=["status", "submitted_at", "rejected_at", "rejection_reason", "updated_at"])
    return expense


def approve_expense(expense: Expense, approver) -> Expense:
    if expense.status != ExpenseStatus.SUBMITTED:
        raise AmaniBuildAPIException("Only submitted expenses can be approved.", code="invalid_status")
    expense.status = ExpenseStatus.APPROVED
    expense.approved_by = approver
    expense.approved_at = timezone.now()
    expense.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
    return expense


def reject_expense(expense: Expense, approver, reason: str = "") -> Expense:
    if expense.status != ExpenseStatus.SUBMITTED:
        raise AmaniBuildAPIException("Only submitted expenses can be rejected.", code="invalid_status")
    expense.status = ExpenseStatus.REJECTED
    expense.approved_by = approver
    expense.rejected_at = timezone.now()
    expense.rejection_reason = reason
    expense.save(update_fields=["status", "approved_by", "rejected_at", "rejection_reason", "updated_at"])
    return expense


def mark_expense_reimbursed(expense: Expense) -> Expense:
    if expense.status != ExpenseStatus.APPROVED:
        raise AmaniBuildAPIException("Only approved expenses can be marked reimbursed.", code="invalid_status")
    expense.status = ExpenseStatus.REIMBURSED
    expense.reimbursed_at = timezone.now()
    expense.save(update_fields=["status", "reimbursed_at", "updated_at"])
    return expense


def get_expense_dashboard(company: Company, project_id=None) -> dict:
    qs = Expense.objects.filter(company=company, is_deleted=False)
    if project_id:
        qs = qs.filter(project_id=project_id)

    aggregates = qs.aggregate(
        total_count=Count("id"),
        draft=Count("id", filter=Q(status=ExpenseStatus.DRAFT)),
        submitted=Count("id", filter=Q(status=ExpenseStatus.SUBMITTED)),
        approved=Count("id", filter=Q(status=ExpenseStatus.APPROVED)),
        rejected=Count("id", filter=Q(status=ExpenseStatus.REJECTED)),
        reimbursed=Count("id", filter=Q(status=ExpenseStatus.REIMBURSED)),
        total_amount=Sum("amount"),
        approved_amount=Sum("amount", filter=Q(status__in=[ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED])),
        pending_amount=Sum("amount", filter=Q(status=ExpenseStatus.SUBMITTED)),
    )

    by_category = (
        qs.filter(status__in=[ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED, ExpenseStatus.SUBMITTED])
        .values("category")
        .annotate(count=Count("id"), amount=Sum("amount"))
        .order_by("-amount")
    )

    return {
        "total_expenses": aggregates["total_count"] or 0,
        "by_status": {
            "draft": aggregates["draft"] or 0,
            "submitted": aggregates["submitted"] or 0,
            "approved": aggregates["approved"] or 0,
            "rejected": aggregates["rejected"] or 0,
            "reimbursed": aggregates["reimbursed"] or 0,
        },
        "total_amount": str(aggregates["total_amount"] or Decimal("0")),
        "approved_amount": str(aggregates["approved_amount"] or Decimal("0")),
        "pending_approval_amount": str(aggregates["pending_amount"] or Decimal("0")),
        "by_category": list(by_category),
    }
