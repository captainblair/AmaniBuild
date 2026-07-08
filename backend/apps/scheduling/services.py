"""Project scheduling business logic."""

from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Max, Q
from django.utils import timezone

from apps.companies.models import Company, CompanyMembership
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.services import get_project_for_company
from apps.projects.models import Project
from apps.scheduling.models import (
    DependencyType,
    ScheduleDependency,
    ScheduleItem,
    ScheduleItemStatus,
    SchedulePhase,
)
from apps.tasks.models import Task, TaskStatus


def assert_valid_assignee(company: Company, user) -> None:
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
            "Assignee must be an active company member.",
            code="invalid_assignee",
        )


def _validate_dates(start_date, end_date) -> None:
    if end_date < start_date:
        raise AmaniBuildAPIException("end_date must be on or after start_date.", code="invalid_dates")


@transaction.atomic
def create_schedule_phase(*, company: Company, project: Project, data: dict) -> SchedulePhase:
    project = get_project_for_company(company, project.id)
    return SchedulePhase.objects.create(
        company=company,
        project=project,
        name=data["name"],
        color=data.get("color", "#F97316"),
        sort_order=data.get("sort_order", 0),
    )


@transaction.atomic
def create_schedule_item(*, company: Company, project: Project, user, data: dict) -> ScheduleItem:
    project = get_project_for_company(company, project.id)
    _validate_dates(data["start_date"], data["end_date"])

    phase = None
    phase_id = data.get("phase_id")
    if phase_id:
        phase = SchedulePhase.objects.filter(company=company, project=project, id=phase_id).first()
        if not phase:
            raise AmaniBuildAPIException("Schedule phase not found.", code="not_found")

    assignee = None
    assignee_id = data.get("assignee_id")
    if assignee_id:
        from django.contrib.auth import get_user_model

        assignee = get_user_model().objects.filter(id=assignee_id).first()
        if not assignee:
            raise AmaniBuildAPIException("Assignee not found.", code="not_found")
        assert_valid_assignee(company, assignee)

    linked_task = None
    linked_task_id = data.get("linked_task_id")
    if linked_task_id:
        linked_task = Task.objects.filter(company=company, project=project, id=linked_task_id).first()
        if not linked_task:
            raise AmaniBuildAPIException("Linked task not found.", code="not_found")

    return ScheduleItem.objects.create(
        company=company,
        project=project,
        phase=phase,
        title=data["title"],
        description=data.get("description", ""),
        start_date=data["start_date"],
        end_date=data["end_date"],
        progress_percent=data.get("progress_percent", 0),
        status=data.get("status", ScheduleItemStatus.NOT_STARTED),
        color=data.get("color", ""),
        sort_order=data.get("sort_order", 0),
        is_milestone=data.get("is_milestone", False),
        assignee=assignee,
        linked_task=linked_task,
        created_by=user,
    )


@transaction.atomic
def update_schedule_item(item: ScheduleItem, data: dict) -> ScheduleItem:
    start_date = data.get("start_date", item.start_date)
    end_date = data.get("end_date", item.end_date)
    _validate_dates(start_date, end_date)

    if "phase_id" in data:
        if data["phase_id"]:
            phase = SchedulePhase.objects.filter(
                company=item.company,
                project=item.project,
                id=data["phase_id"],
            ).first()
            if not phase:
                raise AmaniBuildAPIException("Schedule phase not found.", code="not_found")
            item.phase = phase
        else:
            item.phase = None

    if "assignee_id" in data:
        from django.contrib.auth import get_user_model

        assignee_id = data["assignee_id"]
        if assignee_id:
            assignee = get_user_model().objects.filter(id=assignee_id).first()
            if not assignee:
                raise AmaniBuildAPIException("Assignee not found.", code="not_found")
            assert_valid_assignee(item.company, assignee)
            item.assignee = assignee
        else:
            item.assignee = None

    for field in (
        "title",
        "description",
        "start_date",
        "end_date",
        "progress_percent",
        "status",
        "color",
        "sort_order",
        "is_milestone",
    ):
        if field in data:
            setattr(item, field, data[field])

    if "linked_task_id" in data:
        if data["linked_task_id"]:
            linked_task = Task.objects.filter(
                company=item.company,
                project=item.project,
                id=data["linked_task_id"],
            ).first()
            if not linked_task:
                raise AmaniBuildAPIException("Linked task not found.", code="not_found")
            item.linked_task = linked_task
        else:
            item.linked_task = None

    item.save()
    return item


@transaction.atomic
def create_dependency(
    *,
    company: Company,
    predecessor_id,
    successor_id,
    dependency_type: str = DependencyType.FINISH_TO_START,
    lag_days: int = 0,
) -> ScheduleDependency:
    predecessor = ScheduleItem.objects.filter(company=company, id=predecessor_id, is_deleted=False).first()
    successor = ScheduleItem.objects.filter(company=company, id=successor_id, is_deleted=False).first()
    if not predecessor or not successor:
        raise AmaniBuildAPIException("Schedule item not found.", code="not_found")
    if predecessor.project_id != successor.project_id:
        raise AmaniBuildAPIException("Dependencies must be within the same project.", code="invalid_dependency")
    if predecessor.id == successor.id:
        raise AmaniBuildAPIException("An item cannot depend on itself.", code="invalid_dependency")

    return ScheduleDependency.objects.create(
        predecessor=predecessor,
        successor=successor,
        dependency_type=dependency_type,
        lag_days=lag_days,
    )


def delete_dependency(company: Company, dependency_id) -> None:
    dependency = ScheduleDependency.objects.filter(
        id=dependency_id,
        predecessor__company=company,
    ).first()
    if not dependency:
        raise AmaniBuildAPIException("Dependency not found.", code="not_found")
    dependency.delete()


def _serialize_dependency(dep: ScheduleDependency) -> dict:
    return {
        "id": dep.id,
        "predecessor_id": str(dep.predecessor_id),
        "successor_id": str(dep.successor_id),
        "dependency_type": dep.dependency_type,
        "lag_days": dep.lag_days,
    }


def _serialize_item(item: ScheduleItem) -> dict:
    return {
        "id": str(item.id),
        "phase_id": str(item.phase_id) if item.phase_id else None,
        "phase_name": item.phase.name if item.phase_id else None,
        "title": item.title,
        "description": item.description,
        "start_date": item.start_date.isoformat(),
        "end_date": item.end_date.isoformat(),
        "duration_days": item.duration_days,
        "progress_percent": item.progress_percent,
        "status": item.status,
        "color": item.color or (item.phase.color if item.phase_id else "#3B82F6"),
        "sort_order": item.sort_order,
        "is_milestone": item.is_milestone,
        "assignee_id": str(item.assignee_id) if item.assignee_id else None,
        "assignee_name": item.assignee.full_name if item.assignee_id else None,
        "linked_task_id": str(item.linked_task_id) if item.linked_task_id else None,
    }


def get_gantt_chart(project: Project) -> dict:
    items = list(
        ScheduleItem.objects.filter(company=project.company, project=project, is_deleted=False)
        .select_related("phase", "assignee", "linked_task")
        .order_by("sort_order", "start_date")
    )
    dependencies = ScheduleDependency.objects.filter(
        predecessor__project=project,
        successor__project=project,
    ).select_related("predecessor", "successor")

    phases = list(
        SchedulePhase.objects.filter(company=project.company, project=project, is_deleted=False).order_by("sort_order")
    )

    today = timezone.localdate()
    delayed = sum(1 for item in items if item.end_date < today and item.status != ScheduleItemStatus.COMPLETED)
    completed = sum(1 for item in items if item.status == ScheduleItemStatus.COMPLETED)

    timeline_start = min((item.start_date for item in items), default=project.planned_start_date or today)
    timeline_end = max((item.end_date for item in items), default=project.planned_end_date or today)

    return {
        "project_id": str(project.id),
        "project_name": project.name,
        "timeline_start": timeline_start.isoformat() if timeline_start else None,
        "timeline_end": timeline_end.isoformat() if timeline_end else None,
        "phases": [
            {"id": str(p.id), "name": p.name, "color": p.color, "sort_order": p.sort_order}
            for p in phases
        ],
        "items": [_serialize_item(item) for item in items],
        "dependencies": [_serialize_dependency(dep) for dep in dependencies],
        "summary": {
            "total_items": len(items),
            "completed_items": completed,
            "delayed_items": delayed,
            "milestones": sum(1 for item in items if item.is_milestone),
            "overall_progress": round(sum(item.progress_percent for item in items) / len(items), 1) if items else 0,
        },
    }


def get_schedule_dashboard(project: Project) -> dict:
    items = ScheduleItem.objects.filter(company=project.company, project=project, is_deleted=False)
    today = timezone.localdate()
    aggregates = items.aggregate(
        total=Count("id"),
        completed=Count("id", filter=Q(status=ScheduleItemStatus.COMPLETED)),
        in_progress=Count("id", filter=Q(status=ScheduleItemStatus.IN_PROGRESS)),
        delayed=Count("id", filter=Q(status=ScheduleItemStatus.DELAYED)),
        overdue=Count("id", filter=Q(end_date__lt=today) & ~Q(status=ScheduleItemStatus.COMPLETED)),
    )
    upcoming = items.filter(
        start_date__gte=today,
        start_date__lte=today + timedelta(days=14),
    ).exclude(status=ScheduleItemStatus.COMPLETED).count()

    return {
        "total_items": aggregates["total"] or 0,
        "completed_items": aggregates["completed"] or 0,
        "in_progress_items": aggregates["in_progress"] or 0,
        "delayed_items": aggregates["delayed"] or 0,
        "overdue_items": aggregates["overdue"] or 0,
        "upcoming_starts_14d": upcoming,
        "project_progress_percent": project.progress_percent,
    }


def sync_item_from_linked_task(item: ScheduleItem) -> ScheduleItem:
    if not item.linked_task_id:
        raise AmaniBuildAPIException("No linked task on this schedule item.", code="no_linked_task")
    task = item.linked_task
    if task.status == TaskStatus.DONE:
        item.status = ScheduleItemStatus.COMPLETED
        item.progress_percent = 100
    elif task.status == TaskStatus.IN_PROGRESS:
        item.status = ScheduleItemStatus.IN_PROGRESS
        if item.progress_percent == 0:
            item.progress_percent = 50
    item.save()
    return item
