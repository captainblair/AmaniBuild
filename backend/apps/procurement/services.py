"""Procurement business logic."""

from decimal import Decimal

from django.db import transaction
from django.db.models import Max, Sum
from django.utils import timezone

from apps.companies.models import Company, CompanyRole
from apps.companies.services import get_user_company_role, user_is_company_owner
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.services import get_project_for_company
from apps.procurement.models import (
    ApprovalStepStatus,
    ApprovalStepType,
    PurchaseApprovalStep,
    PurchaseRequest,
    PurchaseRequestLine,
    PurchaseRequestStatus,
)
from apps.projects.models import Project


def generate_request_number(company: Company) -> str:
    year = timezone.localdate().year
    prefix = f"PO-{year}-"
    latest = (
        PurchaseRequest.all_objects.filter(company=company, request_number__startswith=prefix)
        .aggregate(max_num=Max("request_number"))
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


def recalculate_request_total(request: PurchaseRequest) -> PurchaseRequest:
    total = request.lines.aggregate(total=Sum("amount")).get("total") or Decimal("0")
    request.total_amount = total
    request.save(update_fields=["total_amount", "updated_at"])
    return request


@transaction.atomic
def create_purchase_request(*, company: Company, project: Project, user, data: dict) -> PurchaseRequest:
    project = get_project_for_company(company, project.id)
    request = PurchaseRequest.objects.create(
        company=company,
        project=project,
        request_number=generate_request_number(company),
        title=data["title"],
        category=data.get("category", "materials"),
        justification=data.get("justification", ""),
        currency=data.get("currency", "KES"),
        requested_by=user,
        attachments=data.get("attachments", []),
        supplier_quotes=data.get("supplier_quotes", []),
    )
    for index, line in enumerate(data.get("lines", [])):
        PurchaseRequestLine.objects.create(
            request=request,
            description=line["description"],
            quantity=line.get("quantity", 1),
            unit=line.get("unit", "unit"),
            unit_price=line.get("unit_price", 0),
            sort_order=index,
        )
    recalculate_request_total(request)
    return request


@transaction.atomic
def update_purchase_request(request: PurchaseRequest, data: dict) -> PurchaseRequest:
    if request.status != PurchaseRequestStatus.DRAFT:
        raise AmaniBuildAPIException("Only draft requests can be edited.", code="invalid_status")

    for field in ("title", "category", "justification", "currency", "attachments", "supplier_quotes"):
        if field in data:
            setattr(request, field, data[field])

    if "lines" in data:
        request.lines.all().delete()
        for index, line in enumerate(data["lines"]):
            PurchaseRequestLine.objects.create(
                request=request,
                description=line["description"],
                quantity=line.get("quantity", 1),
                unit=line.get("unit", "unit"),
                unit_price=line.get("unit_price", 0),
                sort_order=index,
            )

    request.save()
    recalculate_request_total(request)
    return request


def _create_approval_steps(request: PurchaseRequest) -> None:
    PurchaseApprovalStep.objects.get_or_create(
        request=request,
        step_type=ApprovalStepType.SUBMITTED,
        defaults={
            "status": ApprovalStepStatus.COMPLETED,
            "acted_by": request.requested_by,
            "acted_at": timezone.now(),
        },
    )
    PurchaseApprovalStep.objects.get_or_create(
        request=request,
        step_type=ApprovalStepType.MANAGER_REVIEW,
        defaults={"status": ApprovalStepStatus.PENDING},
    )
    PurchaseApprovalStep.objects.get_or_create(
        request=request,
        step_type=ApprovalStepType.OWNER_APPROVAL,
        defaults={"status": ApprovalStepStatus.PENDING},
    )


@transaction.atomic
def submit_purchase_request(request: PurchaseRequest) -> PurchaseRequest:
    if request.status != PurchaseRequestStatus.DRAFT:
        raise AmaniBuildAPIException("Only draft requests can be submitted.", code="invalid_status")
    if not request.lines.exists():
        raise AmaniBuildAPIException("Add at least one line item before submitting.", code="lines_required")

    request.status = PurchaseRequestStatus.PENDING_MANAGER
    request.submitted_at = timezone.now()
    request.save(update_fields=["status", "submitted_at", "updated_at"])
    _create_approval_steps(request)
    return request


def _user_can_manager_approve(user, company: Company) -> bool:
    role = get_user_company_role(user, company)
    return role in {CompanyRole.OWNER, CompanyRole.PROJECT_MANAGER}


def _user_can_owner_approve(user, company: Company) -> bool:
    return user_is_company_owner(user, company)


@transaction.atomic
def approve_purchase_request(request: PurchaseRequest, user, notes: str = "") -> PurchaseRequest:
    if request.status == PurchaseRequestStatus.PENDING_MANAGER:
        if not _user_can_manager_approve(user, request.company):
            raise AmaniBuildAPIException(
                "Only a project manager or owner can approve at this step.",
                code="forbidden",
            )
        step = request.approval_steps.filter(step_type=ApprovalStepType.MANAGER_REVIEW).first()
        if step:
            step.status = ApprovalStepStatus.COMPLETED
            step.acted_by = user
            step.acted_at = timezone.now()
            step.notes = notes
            step.save()
        request.status = PurchaseRequestStatus.PENDING_OWNER
        request.save(update_fields=["status", "updated_at"])
        return request

    if request.status == PurchaseRequestStatus.PENDING_OWNER:
        if not _user_can_owner_approve(user, request.company):
            raise AmaniBuildAPIException(
                "Only the company owner can give final approval.",
                code="forbidden",
            )
        step = request.approval_steps.filter(step_type=ApprovalStepType.OWNER_APPROVAL).first()
        if step:
            step.status = ApprovalStepStatus.COMPLETED
            step.acted_by = user
            step.acted_at = timezone.now()
            step.notes = notes
            step.save()
        request.status = PurchaseRequestStatus.APPROVED
        request.approved_at = timezone.now()
        request.save(update_fields=["status", "approved_at", "updated_at"])
        return request

    raise AmaniBuildAPIException("This request cannot be approved in its current state.", code="invalid_status")


@transaction.atomic
def reject_purchase_request(request: PurchaseRequest, user, reason: str) -> PurchaseRequest:
    if request.status not in {PurchaseRequestStatus.PENDING_MANAGER, PurchaseRequestStatus.PENDING_OWNER}:
        raise AmaniBuildAPIException("Only pending requests can be rejected.", code="invalid_status")

    if request.status == PurchaseRequestStatus.PENDING_MANAGER:
        if not _user_can_manager_approve(user, request.company):
            raise AmaniBuildAPIException("You cannot reject at this approval step.", code="forbidden")
        step_type = ApprovalStepType.MANAGER_REVIEW
    else:
        if not _user_can_owner_approve(user, request.company):
            raise AmaniBuildAPIException("You cannot reject at this approval step.", code="forbidden")
        step_type = ApprovalStepType.OWNER_APPROVAL

    step = request.approval_steps.filter(step_type=step_type).first()
    if step:
        step.status = ApprovalStepStatus.REJECTED
        step.acted_by = user
        step.acted_at = timezone.now()
        step.notes = reason
        step.save()

    request.status = PurchaseRequestStatus.REJECTED
    request.rejected_at = timezone.now()
    request.rejection_reason = reason
    request.save(update_fields=["status", "rejected_at", "rejection_reason", "updated_at"])
    return request


def get_request_activity(request: PurchaseRequest) -> list[dict]:
    activities = []
    if request.submitted_at:
        activities.append(
            {
                "action": "submitted",
                "actor": request.requested_by.full_name if request.requested_by else None,
                "timestamp": request.submitted_at.isoformat(),
            }
        )
    for step in request.approval_steps.select_related("acted_by").all():
        if step.acted_at:
            activities.append(
                {
                    "action": step.step_type,
                    "status": step.status,
                    "actor": step.acted_by.full_name if step.acted_by else None,
                    "timestamp": step.acted_at.isoformat(),
                    "notes": step.notes,
                }
            )
    if request.approved_at:
        activities.append({"action": "approved", "timestamp": request.approved_at.isoformat()})
    if request.rejected_at:
        activities.append(
            {
                "action": "rejected",
                "timestamp": request.rejected_at.isoformat(),
                "notes": request.rejection_reason,
            }
        )
    return activities
