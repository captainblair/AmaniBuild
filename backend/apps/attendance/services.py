"""Attendance business logic."""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Count
from django.utils import timezone

from apps.attendance.models import (
    AttendanceDayStatus,
    AttendanceEvent,
    AttendanceEventType,
    AttendanceManualMark,
    AttendanceMethod,
    CheckInPoint,
    ProjectWorkerAssignment,
)
from apps.companies.models import Company, CompanyMembership, Site
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.services import get_project_for_company
from apps.projects.models import Project

LATE_GRACE_MINUTES = 15
DUPLICATE_SCAN_MINUTES = 5


def assert_worker_assigned(project: Project, worker) -> ProjectWorkerAssignment:
    assignment = ProjectWorkerAssignment.objects.filter(
        project=project,
        worker=worker,
        is_active=True,
        is_deleted=False,
    ).first()
    if not assignment:
        raise AmaniBuildAPIException(
            "Worker is not assigned to this project.",
            code="not_assigned",
        )
    return assignment


def assert_company_worker(company: Company, worker) -> None:
    is_member = CompanyMembership.objects.filter(
        company=company,
        user=worker,
        is_active=True,
        is_deleted=False,
    ).exists()
    if not is_member and company.owner_id != worker.id:
        raise AmaniBuildAPIException("User is not a company member.", code="not_assigned")


def get_check_in_point(company: Company, code: str) -> CheckInPoint:
    point = CheckInPoint.objects.filter(
        company=company,
        code=code,
        is_active=True,
        is_deleted=False,
    ).select_related("site").first()
    if not point:
        raise AmaniBuildAPIException("Invalid check-in point code.", code="invalid_check_in_point")
    return point


def _work_date_from_event(event_at: datetime) -> date:
    return timezone.localtime(event_at).date()


def _is_late_arrival(assignment: ProjectWorkerAssignment, event_at: datetime) -> bool:
    local_dt = timezone.localtime(event_at)
    shift_start = datetime.combine(local_dt.date(), assignment.shift_start_time)
    shift_start = timezone.make_aware(shift_start, timezone.get_current_timezone())
    grace = timedelta(minutes=LATE_GRACE_MINUTES)
    return local_dt > shift_start + grace


def _detect_duplicate_scan(worker, check_in_point: CheckInPoint, event_at: datetime) -> AttendanceEvent | None:
    window_start = event_at - timedelta(minutes=DUPLICATE_SCAN_MINUTES)
    return AttendanceEvent.objects.filter(
        worker=worker,
        check_in_point=check_in_point,
        event_type=AttendanceEventType.CHECK_IN,
        event_at__gte=window_start,
        event_at__lte=event_at,
        is_deleted=False,
    ).first()


def record_attendance_event(
    *,
    company: Company,
    project: Project,
    worker,
    event_type: str,
    method: str,
    event_at: datetime | None = None,
    check_in_point: CheckInPoint | None = None,
    recorded_by=None,
    latitude=None,
    longitude=None,
    notes: str = "",
    is_offline_sync: bool = False,
    client_event_id: str = "",
    allow_duplicate_warning: bool = True,
) -> tuple[AttendanceEvent | None, dict | None]:
    event_at = event_at or timezone.now()
    assignment = assert_worker_assigned(project, worker)

    if client_event_id:
        existing = AttendanceEvent.objects.filter(
            worker=worker,
            client_event_id=client_event_id,
            is_deleted=False,
        ).first()
        if existing:
            return existing, None

    duplicate_warning = None
    if (
        allow_duplicate_warning
        and method == AttendanceMethod.QR_SCAN
        and event_type == AttendanceEventType.CHECK_IN
        and check_in_point
    ):
        duplicate = _detect_duplicate_scan(worker, check_in_point, event_at)
        if duplicate:
            duplicate_warning = {
                "code": "duplicate_scan",
                "message": (
                    f"This QR code was scanned recently at {duplicate.event_at.strftime('%H:%M')}. "
                    "Duplicate scan ignored."
                ),
                "previous_event_id": str(duplicate.id),
            }
            return None, duplicate_warning

    is_late = False
    if event_type == AttendanceEventType.CHECK_IN:
        is_late = _is_late_arrival(assignment, event_at)

    event = AttendanceEvent.objects.create(
        company=company,
        project=project,
        worker=worker,
        event_type=event_type,
        event_at=event_at,
        work_date=_work_date_from_event(event_at),
        check_in_point=check_in_point,
        method=method,
        is_late=is_late,
        latitude=latitude,
        longitude=longitude,
        notes=notes,
        recorded_by=recorded_by,
        is_offline_sync=is_offline_sync,
        client_event_id=client_event_id,
    )
    return event, duplicate_warning


def manual_mark_attendance(
    *,
    company: Company,
    project: Project,
    worker,
    work_date: date,
    status: str,
    marked_by,
    notes: str = "",
) -> AttendanceManualMark:
    assert_worker_assigned(project, worker)
    if status not in {AttendanceDayStatus.PRESENT, AttendanceDayStatus.ABSENT, AttendanceDayStatus.LATE}:
        raise AmaniBuildAPIException("Invalid attendance status for manual mark.", code="invalid_status")

    mark, _created = AttendanceManualMark.objects.update_or_create(
        project=project,
        worker=worker,
        work_date=work_date,
        defaults={
            "company": company,
            "status": status,
            "notes": notes,
            "marked_by": marked_by,
            "is_deleted": False,
            "deleted_at": None,
        },
    )
    return mark


def _worker_day_status(
    assignment: ProjectWorkerAssignment,
    work_date: date,
    events: list[AttendanceEvent],
    manual_mark: AttendanceManualMark | None,
) -> str:
    if manual_mark and manual_mark.status == AttendanceDayStatus.ABSENT:
        return AttendanceDayStatus.ABSENT

    check_ins = [e for e in events if e.event_type == AttendanceEventType.CHECK_IN]
    if not check_ins:
        if manual_mark:
            return manual_mark.status
        return AttendanceDayStatus.NOT_CHECKED_IN

    if manual_mark and manual_mark.status in {AttendanceDayStatus.PRESENT, AttendanceDayStatus.LATE}:
        return manual_mark.status

    if any(e.is_late for e in check_ins):
        return AttendanceDayStatus.LATE
    return AttendanceDayStatus.PRESENT


def _is_on_site_now(events: list[AttendanceEvent]) -> bool:
    if not events:
        return False
    sorted_events = sorted(events, key=lambda e: e.event_at)
    last = sorted_events[-1]
    return last.event_type in {AttendanceEventType.CHECK_IN, AttendanceEventType.BREAK_END}


def _calculate_hours(events: list[AttendanceEvent], shift_end: time) -> tuple[Decimal, Decimal]:
    if not events:
        return Decimal("0"), Decimal("0")

    sorted_events = sorted(events, key=lambda e: e.event_at)
    check_in = next((e for e in sorted_events if e.event_type == AttendanceEventType.CHECK_IN), None)
    check_out = next((e for e in reversed(sorted_events) if e.event_type == AttendanceEventType.CHECK_OUT), None)
    if not check_in:
        return Decimal("0"), Decimal("0")

    end_at = check_out.event_at if check_out else timezone.now()
    total_hours = Decimal(str((end_at - check_in.event_at).total_seconds() / 3600)).quantize(Decimal("0.1"))

    shift_end_dt = timezone.make_aware(
        datetime.combine(check_in.work_date, shift_end),
        timezone.get_current_timezone(),
    )
    overtime = Decimal("0")
    if check_out and check_out.event_at > shift_end_dt:
        overtime = Decimal(str((check_out.event_at - shift_end_dt).total_seconds() / 3600)).quantize(Decimal("0.1"))
    return total_hours, overtime


def get_worker_cards(project: Project, work_date: date) -> list[dict]:
    assignments = ProjectWorkerAssignment.objects.filter(
        project=project,
        is_active=True,
        is_deleted=False,
    ).select_related("worker")

    worker_ids = [a.worker_id for a in assignments]
    events = AttendanceEvent.objects.filter(
        project=project,
        worker_id__in=worker_ids,
        work_date=work_date,
        is_deleted=False,
    ).select_related("check_in_point", "worker")

    events_by_worker: dict = {}
    for event in events:
        events_by_worker.setdefault(event.worker_id, []).append(event)

    marks = AttendanceManualMark.objects.filter(
        project=project,
        work_date=work_date,
        is_deleted=False,
    )
    marks_by_worker = {m.worker_id: m for m in marks}

    cards = []
    for assignment in assignments:
        worker_events = events_by_worker.get(assignment.worker_id, [])
        manual_mark = marks_by_worker.get(assignment.worker_id)
        status = _worker_day_status(assignment, work_date, worker_events, manual_mark)
        check_in = next(
            (e for e in sorted(worker_events, key=lambda x: x.event_at) if e.event_type == AttendanceEventType.CHECK_IN),
            None,
        )
        cards.append(
            {
                "worker_id": str(assignment.worker_id),
                "full_name": assignment.worker.full_name,
                "email": assignment.worker.email,
                "trade": assignment.trade,
                "employee_code": assignment.employee_code,
                "shift_start": assignment.shift_start_time.isoformat(),
                "shift_end": assignment.shift_end_time.isoformat(),
                "status": status,
                "check_in_at": check_in.event_at.isoformat() if check_in else None,
                "check_in_location": check_in.check_in_point.name if check_in and check_in.check_in_point else None,
                "on_site_now": _is_on_site_now(worker_events),
                "is_late": check_in.is_late if check_in else False,
            }
        )
    return cards


def get_attendance_dashboard(project: Project, work_date: date) -> dict:
    cards = get_worker_cards(project, work_date)
    total_assigned = len(cards)
    present_count = sum(1 for c in cards if c["status"] in {AttendanceDayStatus.PRESENT, AttendanceDayStatus.LATE})
    absent_count = sum(1 for c in cards if c["status"] == AttendanceDayStatus.ABSENT)
    late_count = sum(1 for c in cards if c["status"] == AttendanceDayStatus.LATE)
    on_site_count = sum(1 for c in cards if c["on_site_now"])
    not_checked_in = sum(1 for c in cards if c["status"] == AttendanceDayStatus.NOT_CHECKED_IN)

    attendance_rate = round((present_count / total_assigned) * 100, 1) if total_assigned else 0.0

    assignments = {a.worker_id: a for a in ProjectWorkerAssignment.objects.filter(project=project, is_active=True, is_deleted=False)}
    events = AttendanceEvent.objects.filter(project=project, work_date=work_date, is_deleted=False)
    overtime_total = Decimal("0")
    for worker_id, worker_events in _group_events_by_worker(events):
        assignment = assignments.get(worker_id)
        if assignment:
            _, overtime = _calculate_hours(worker_events, assignment.shift_end_time)
            overtime_total += overtime

    return {
        "work_date": work_date.isoformat(),
        "total_assigned": total_assigned,
        "present_today": present_count,
        "absent_today": absent_count,
        "late_arrivals": late_count,
        "not_checked_in": not_checked_in,
        "on_site_now": on_site_count,
        "attendance_rate_percent": attendance_rate,
        "overtime_hours_today": float(overtime_total),
        "workers": cards,
    }


def _group_events_by_worker(events):
    grouped = {}
    for event in events:
        grouped.setdefault(event.worker_id, []).append(event)
    return grouped.items()


def get_attendance_analytics(project: Project, date_from: date, date_to: date) -> dict:
    assignments_count = ProjectWorkerAssignment.objects.filter(
        project=project, is_active=True, is_deleted=False
    ).count()
    if assignments_count == 0:
        return {
            "daily_trend": [],
            "trade_breakdown": [],
            "late_arrival_buckets": {"on_time": 0, "late_1_30": 0, "very_late": 0},
        }

    daily_trend = []
    current = date_from
    while current <= date_to:
        dashboard = get_attendance_dashboard(project, current)
        daily_trend.append(
            {
                "date": current.isoformat(),
                "attendance_rate_percent": dashboard["attendance_rate_percent"],
                "present": dashboard["present_today"],
                "absent": dashboard["absent_today"],
            }
        )
        current += timedelta(days=1)

    events = AttendanceEvent.objects.filter(
        project=project,
        work_date__gte=date_from,
        work_date__lte=date_to,
        event_type=AttendanceEventType.CHECK_IN,
        is_deleted=False,
    )
    on_time = events.filter(is_late=False).count()
    late = events.filter(is_late=True).count()

    trade_counts = (
        ProjectWorkerAssignment.objects.filter(project=project, is_active=True, is_deleted=False)
        .values("trade")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    return {
        "daily_trend": daily_trend,
        "trade_breakdown": list(trade_counts),
        "late_arrival_buckets": {
            "on_time": on_time,
            "late_1_30": late,
            "very_late": 0,
        },
    }


def get_worker_attendance_history(project: Project, worker, date_from: date, date_to: date) -> dict:
    assert_worker_assigned(project, worker)
    events = AttendanceEvent.objects.filter(
        project=project,
        worker=worker,
        work_date__gte=date_from,
        work_date__lte=date_to,
        is_deleted=False,
    ).select_related("check_in_point").order_by("event_at")

    days: dict[str, list] = {}
    for event in events:
        key = event.work_date.isoformat()
        days.setdefault(key, []).append(
            {
                "id": str(event.id),
                "event_type": event.event_type,
                "event_at": event.event_at.isoformat(),
                "method": event.method,
                "location": event.check_in_point.name if event.check_in_point else None,
                "is_late": event.is_late,
            }
        )

    calendar = []
    current = date_from
    while current <= date_to:
        day_events = days.get(current.isoformat(), [])
        assignment = ProjectWorkerAssignment.objects.filter(project=project, worker=worker, is_active=True).first()
        manual = AttendanceManualMark.objects.filter(project=project, worker=worker, work_date=current).first()
        status = _worker_day_status(assignment, current, [e for e in events if e.work_date == current], manual) if assignment else AttendanceDayStatus.NOT_CHECKED_IN
        calendar.append({"date": current.isoformat(), "status": status, "events": day_events})
        current += timedelta(days=1)

    return {
        "worker_id": str(worker.id),
        "worker_name": worker.full_name,
        "calendar": calendar,
    }


def get_worker_today_activity(project: Project, worker, work_date: date | None = None) -> dict:
    work_date = work_date or timezone.localdate()
    assignment = assert_worker_assigned(project, worker)
    events = list(
        AttendanceEvent.objects.filter(
            project=project,
            worker=worker,
            work_date=work_date,
            is_deleted=False,
        )
        .select_related("check_in_point")
        .order_by("event_at")
    )
    manual = AttendanceManualMark.objects.filter(project=project, worker=worker, work_date=work_date).first()
    status = _worker_day_status(assignment, work_date, events, manual)
    total_hours, overtime = _calculate_hours(events, assignment.shift_end_time)

    return {
        "work_date": work_date.isoformat(),
        "project_id": str(project.id),
        "project_name": project.name,
        "status": status,
        "shift_start": assignment.shift_start_time.isoformat(),
        "shift_end": assignment.shift_end_time.isoformat(),
        "trade": assignment.trade,
        "employee_code": assignment.employee_code,
        "on_site_now": _is_on_site_now(events),
        "total_hours": float(total_hours),
        "overtime_hours": float(overtime),
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "event_at": e.event_at.isoformat(),
                "method": e.method,
                "location": e.check_in_point.name if e.check_in_point else None,
                "is_late": e.is_late,
            }
            for e in events
        ],
    }


def validate_site_for_company(company: Company, site: Site) -> None:
    if site.company_id != company.id or site.is_deleted:
        raise AmaniBuildAPIException("Site not found.", code="not_found")
