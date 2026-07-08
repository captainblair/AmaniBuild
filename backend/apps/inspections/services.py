"""Inspection business logic."""

import uuid

from django.db import transaction
from django.db.models import Count, Max, Q
from django.utils import timezone

from apps.companies.models import Company, CompanyMembership
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.services import get_project_for_company
from apps.inspections.models import (
    Inspection,
    InspectionResult,
    InspectionStatus,
    InspectionType,
)
from apps.projects.models import Project


CHECKLIST_TEMPLATES: dict[str, list[dict]] = {
    InspectionType.GENERAL: [
        {"section": "Site Setup", "description": "Work area is clean and organized", "required": True},
        {"section": "Site Setup", "description": "Required permits displayed on site", "required": True},
        {"section": "Quality", "description": "Work matches approved drawings/specifications", "required": True},
        {"section": "Quality", "description": "Materials stored correctly and protected", "required": False},
    ],
    InspectionType.STRUCTURAL: [
        {"section": "Formwork", "description": "Formwork alignment and bracing verified", "required": True},
        {"section": "Reinforcement", "description": "Rebar spacing and cover meet specifications", "required": True},
        {"section": "Concrete", "description": "Concrete slump and placement procedures followed", "required": True},
        {"section": "Curing", "description": "Curing method in place where applicable", "required": False},
    ],
    InspectionType.SAFETY: [
        {"section": "PPE", "description": "All workers wearing required PPE", "required": True},
        {"section": "Access", "description": "Scaffolding and ladders properly secured", "required": True},
        {"section": "Hazards", "description": "Open edges and excavations protected", "required": True},
        {"section": "Emergency", "description": "First aid kit accessible and stocked", "required": True},
    ],
    InspectionType.ELECTRICAL: [
        {"section": "Installation", "description": "Conduit routing matches approved layout", "required": True},
        {"section": "Installation", "description": "Cable sizing and labeling verified", "required": True},
        {"section": "Safety", "description": "Earthing and bonding completed", "required": True},
    ],
    InspectionType.PLUMBING: [
        {"section": "Piping", "description": "Pipe slopes and supports verified", "required": True},
        {"section": "Testing", "description": "Pressure test completed and documented", "required": True},
        {"section": "Fixtures", "description": "Fixture locations match drawings", "required": False},
    ],
    InspectionType.FINISHING: [
        {"section": "Surfaces", "description": "Surface preparation meets specification", "required": True},
        {"section": "Finishes", "description": "Paint/tile/finish quality acceptable", "required": True},
        {"section": "Snagging", "description": "Defect list captured for rework", "required": False},
    ],
    InspectionType.MEP: [
        {"section": "Coordination", "description": "MEP routing coordinated with structure", "required": True},
        {"section": "Testing", "description": "Commissioning tests completed", "required": True},
        {"section": "Documentation", "description": "As-built markups submitted", "required": False},
    ],
    InspectionType.OTHER: [
        {"section": "General", "description": "Inspection scope defined and agreed", "required": True},
        {"section": "General", "description": "Checklist items completed", "required": True},
    ],
}


def get_checklist_templates() -> list[dict]:
    return [
        {
            "inspection_type": inspection_type,
            "label": InspectionType(inspection_type).label,
            "items": items,
        }
        for inspection_type, items in CHECKLIST_TEMPLATES.items()
    ]


def build_checklist_from_template(inspection_type: str) -> list[dict]:
    template = CHECKLIST_TEMPLATES.get(inspection_type, CHECKLIST_TEMPLATES[InspectionType.GENERAL])
    return [
        {
            "id": str(uuid.uuid4()),
            "section": item["section"],
            "description": item["description"],
            "required": item.get("required", True),
            "status": "pending",
            "notes": "",
        }
        for item in template
    ]


def generate_inspection_number(company: Company) -> str:
    year = timezone.localdate().year
    prefix = f"INS-{year}-"
    latest = (
        Inspection.all_objects.filter(company=company, inspection_number__startswith=prefix)
        .aggregate(max_num=Max("inspection_number"))
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


def assert_valid_inspector(company: Company, user) -> None:
    if user is None:
        return
    is_member = CompanyMembership.objects.filter(
        company=company,
        user=user,
        is_active=True,
        is_deleted=False,
    ).exists()
    if not is_member and company.owner_id != user.id:
        raise AmaniBuildAPIException(
            "Inspector must be an active company member.",
            code="invalid_inspector",
        )


def calculate_score_percent(checklist_items: list) -> int:
    if not checklist_items:
        return 0
    scored = [item for item in checklist_items if item.get("status") in ("pass", "fail")]
    if not scored:
        return 0
    passed = sum(1 for item in scored if item.get("status") == "pass")
    return round((passed / len(scored)) * 100)


def assert_editable(inspection: Inspection) -> None:
    if inspection.status not in (InspectionStatus.DRAFT, InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS):
        raise AmaniBuildAPIException(
            "Only draft, scheduled, or in-progress inspections can be edited.",
            code="invalid_status",
        )


@transaction.atomic
def create_inspection(*, company: Company, project: Project, user, data: dict) -> Inspection:
    project = get_project_for_company(company, project.id)
    inspector_id = data.get("inspector_id")
    inspector = None
    if inspector_id:
        from django.contrib.auth import get_user_model

        inspector = get_user_model().objects.filter(id=inspector_id).first()
        if not inspector:
            raise AmaniBuildAPIException("Inspector not found.", code="not_found")
        assert_valid_inspector(company, inspector)

    inspection_type = data.get("inspection_type", InspectionType.GENERAL)
    use_template = data.get("use_template", True)
    checklist_items = data.get("checklist_items")
    if checklist_items is None and use_template:
        checklist_items = build_checklist_from_template(inspection_type)
    elif checklist_items is None:
        checklist_items = []

    status = InspectionStatus.DRAFT
    scheduled_date = data.get("scheduled_date")
    if scheduled_date:
        status = InspectionStatus.SCHEDULED

    return Inspection.objects.create(
        company=company,
        project=project,
        inspection_number=generate_inspection_number(company),
        title=data["title"],
        description=data.get("description", ""),
        inspection_type=inspection_type,
        area_location=data.get("area_location", ""),
        status=status,
        checklist_items=checklist_items,
        findings=data.get("findings", []),
        photos=data.get("photos", []),
        scheduled_date=scheduled_date,
        inspector=inspector or user,
        created_by=user,
    )


@transaction.atomic
def update_inspection(inspection: Inspection, data: dict) -> Inspection:
    assert_editable(inspection)

    if "inspector_id" in data:
        from django.contrib.auth import get_user_model

        inspector_id = data["inspector_id"]
        if inspector_id:
            inspector = get_user_model().objects.filter(id=inspector_id).first()
            if not inspector:
                raise AmaniBuildAPIException("Inspector not found.", code="not_found")
            assert_valid_inspector(inspection.company, inspector)
            inspection.inspector = inspector
        else:
            inspection.inspector = None

    for field in ("title", "description", "inspection_type", "area_location", "scheduled_date"):
        if field in data:
            setattr(inspection, field, data[field])

    if "checklist_items" in data:
        inspection.checklist_items = data["checklist_items"]
        inspection.score_percent = calculate_score_percent(inspection.checklist_items)

    if "findings" in data:
        inspection.findings = data["findings"]

    if "photos" in data:
        inspection.photos = data["photos"]

    if "scheduled_date" in data and inspection.status == InspectionStatus.DRAFT:
        inspection.status = InspectionStatus.SCHEDULED if data["scheduled_date"] else InspectionStatus.DRAFT

    inspection.save()
    return inspection


def start_inspection(inspection: Inspection) -> Inspection:
    if inspection.status not in (InspectionStatus.DRAFT, InspectionStatus.SCHEDULED):
        raise AmaniBuildAPIException(
            "Only draft or scheduled inspections can be started.",
            code="invalid_status",
        )
    inspection.status = InspectionStatus.IN_PROGRESS
    inspection.inspected_at = timezone.now()
    inspection.save(update_fields=["status", "inspected_at", "updated_at"])
    return inspection


def submit_inspection(inspection: Inspection) -> Inspection:
    if inspection.status != InspectionStatus.IN_PROGRESS:
        raise AmaniBuildAPIException("Only in-progress inspections can be submitted.", code="invalid_status")

    required_items = [item for item in (inspection.checklist_items or []) if item.get("required")]
    pending_required = [item for item in required_items if item.get("status") in (None, "", "pending")]
    if pending_required:
        raise AmaniBuildAPIException(
            "All required checklist items must be completed before submission.",
            code="incomplete_checklist",
        )

    inspection.score_percent = calculate_score_percent(inspection.checklist_items)
    inspection.status = InspectionStatus.SUBMITTED
    inspection.submitted_at = timezone.now()
    inspection.save(update_fields=["score_percent", "status", "submitted_at", "updated_at"])
    return inspection


def review_inspection(inspection: Inspection, reviewer, *, result: str, notes: str = "") -> Inspection:
    if inspection.status != InspectionStatus.SUBMITTED:
        raise AmaniBuildAPIException("Only submitted inspections can be reviewed.", code="invalid_status")

    if result not in InspectionResult.values:
        raise AmaniBuildAPIException("Invalid inspection result.", code="invalid_result")

    inspection.result = result
    inspection.reviewed_by = reviewer
    inspection.reviewed_at = timezone.now()

    if result == InspectionResult.FAIL:
        inspection.status = InspectionStatus.FAILED
    else:
        inspection.status = InspectionStatus.PASSED

    if notes:
        findings = list(inspection.findings or [])
        findings.append(
            {
                "id": str(uuid.uuid4()),
                "severity": "medium",
                "description": notes,
                "corrective_action": "",
                "due_date": None,
                "resolved": result != InspectionResult.FAIL,
            }
        )
        inspection.findings = findings

    inspection.save()
    return inspection


def get_inspection_dashboard(company: Company, project_id=None) -> dict:
    qs = Inspection.objects.filter(company=company, is_deleted=False)
    if project_id:
        qs = qs.filter(project_id=project_id)

    aggregates = qs.aggregate(
        total=Count("id"),
        draft=Count("id", filter=Q(status=InspectionStatus.DRAFT)),
        scheduled=Count("id", filter=Q(status=InspectionStatus.SCHEDULED)),
        in_progress=Count("id", filter=Q(status=InspectionStatus.IN_PROGRESS)),
        submitted=Count("id", filter=Q(status=InspectionStatus.SUBMITTED)),
        passed=Count("id", filter=Q(status=InspectionStatus.PASSED)),
        failed=Count("id", filter=Q(status=InspectionStatus.FAILED)),
    )

    today = timezone.localdate()
    overdue = qs.filter(
        scheduled_date__lt=today,
        status__in=[InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS],
    ).count()

    recent_failed = list(
        qs.filter(status=InspectionStatus.FAILED)
        .select_related("project")
        .order_by("-reviewed_at")[:5]
        .values("id", "inspection_number", "title", "project__name", "reviewed_at")
    )

    return {
        "total_inspections": aggregates["total"] or 0,
        "by_status": {
            "draft": aggregates["draft"] or 0,
            "scheduled": aggregates["scheduled"] or 0,
            "in_progress": aggregates["in_progress"] or 0,
            "submitted": aggregates["submitted"] or 0,
            "passed": aggregates["passed"] or 0,
            "failed": aggregates["failed"] or 0,
        },
        "overdue_count": overdue,
        "pass_rate_percent": _pass_rate(aggregates),
        "recent_failed": recent_failed,
    }


def _pass_rate(aggregates: dict) -> float:
    completed = (aggregates["passed"] or 0) + (aggregates["failed"] or 0)
    if not completed:
        return 0.0
    return round(((aggregates["passed"] or 0) / completed) * 100, 1)
