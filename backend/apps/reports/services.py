"""Reports and analytics business logic."""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Sum
from django.utils import timezone

from apps.attendance.models import AttendanceEvent, AttendanceEventType, ProjectWorkerAssignment
from apps.attendance.services import get_attendance_analytics
from apps.companies.models import Company
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.models import SiteDiaryEntry
from apps.diary.services import get_project_diary_insights
from apps.inventory.models import InventoryItem, StockMovement, StockMovementType
from apps.inventory.services import get_inventory_dashboard
from apps.procurement.models import PurchaseRequest, PurchaseRequestStatus
from apps.projects.models import Project
from apps.reports.models import GeneratedReport, ReportType
from apps.tasks.models import Task, TaskPriority, TaskStatus


def get_project_for_company(company: Company, project_id) -> Project:
    project = Project.objects.filter(company=company, id=project_id, is_deleted=False).first()
    if not project:
        raise AmaniBuildAPIException("Project not found.", code="not_found")
    return project


def _date_range(date_from=None, date_to=None):
    today = timezone.localdate()
    date_to = date_to or today
    date_from = date_from or (date_to - timedelta(days=30))
    return date_from, date_to


def get_report_templates() -> list[dict]:
    return [
        {"report_type": key, "label": label}
        for key, label in ReportType.choices
    ]


def get_portfolio_analytics(company: Company) -> dict:
    projects = Project.objects.filter(company=company, is_deleted=False)
    total_projects = projects.count()
    active_projects = projects.filter(status="active").count()
    avg_progress = projects.aggregate(avg=Avg("progress_percent"))["avg"] or 0
    budget_total = projects.aggregate(total=Sum("budget_total"))["total"] or Decimal("0")
    budget_spent = projects.aggregate(total=Sum("budget_spent"))["total"] or Decimal("0")

    tasks = Task.objects.filter(company=company, is_deleted=False)
    inventory = get_inventory_dashboard(company)
    procurement = PurchaseRequest.objects.filter(company=company, is_deleted=False)

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": projects.filter(status="completed").count(),
        "average_progress": round(float(avg_progress), 1),
        "budget_total": str(budget_total),
        "budget_spent": str(budget_spent),
        "budget_remaining": str(max(budget_total - budget_spent, Decimal("0"))),
        "budget_variance_percent": round(float((budget_total - budget_spent) / budget_total * 100), 1)
        if budget_total
        else 0.0,
        "tasks_open": tasks.exclude(status=TaskStatus.DONE).count(),
        "tasks_overdue": tasks.filter(due_date__lt=timezone.localdate()).exclude(status=TaskStatus.DONE).count(),
        "pending_purchase_approvals": procurement.filter(
            status__in=[PurchaseRequestStatus.PENDING_MANAGER, PurchaseRequestStatus.PENDING_OWNER]
        ).count(),
        "inventory_low_stock_alerts": inventory["low_stock_alerts"],
    }


def get_project_report_data(project: Project, report_type: str, date_from=None, date_to=None) -> dict:
    date_from, date_to = _date_range(date_from, date_to)

    if report_type == ReportType.PROGRESS:
        diary = get_project_diary_insights(project)
        milestones = [
            {"name": "Overall Completion", "planned_percent": project.progress_percent + 5 if project.progress_percent <= 95 else 100, "actual_percent": project.progress_percent},
            {"name": "Diary Approvals", "planned_percent": 100, "actual_percent": diary["approved_entries"]},
        ]
        return {
            "executive_summary": {
                "overall_progress": project.progress_percent,
                "planned_progress": min(project.progress_percent + 5, 100),
                "actual_progress": project.progress_percent,
                "variance_percent": -5 if project.progress_percent < 100 else 0,
                "days_remaining": (
                    (project.planned_end_date - timezone.localdate()).days
                    if project.planned_end_date
                    else None
                ),
            },
            "diary_insights": diary,
            "milestones": milestones,
        }

    if report_type == ReportType.COST_VARIANCE or report_type == ReportType.BUDGET_VS_ACTUAL:
        total_budget = project.budget_total
        spent = project.budget_spent
        remaining = max(total_budget - spent, Decimal("0"))
        utilization = round(float((spent / total_budget) * 100), 1) if total_budget else 0.0
        approved_procurement = (
            PurchaseRequest.objects.filter(
                company=project.company,
                project=project,
                status=PurchaseRequestStatus.APPROVED,
                is_deleted=False,
            ).aggregate(total=Sum("total_amount"))["total"]
            or Decimal("0")
        )
        return {
            "budget_total": str(total_budget),
            "budget_spent": str(spent),
            "budget_remaining": str(remaining),
            "budget_utilization_percent": utilization,
            "approved_procurement_total": str(approved_procurement),
        }

    if report_type == ReportType.ATTENDANCE_PAYROLL:
        analytics = get_attendance_analytics(project, date_from, date_to)
        assignments = ProjectWorkerAssignment.objects.filter(project=project, is_active=True, is_deleted=False)
        return {
            "attendance": analytics,
            "active_workers": assignments.count(),
        }

    if report_type == ReportType.MATERIAL_USAGE:
        dashboard = get_inventory_dashboard(project.company, project_id=project.id)
        movement_totals = (
            StockMovement.objects.filter(
                company=project.company,
                project=project,
                is_deleted=False,
            )
            .values("movement_type")
            .annotate(total=Sum("quantity"))
        )
        return {
            "inventory": dashboard,
            "movement_totals": list(movement_totals),
        }

    if report_type == ReportType.DIARY_SUMMARY:
        entries = SiteDiaryEntry.objects.filter(
            company=project.company,
            project=project,
            entry_date__gte=date_from,
            entry_date__lte=date_to,
            is_deleted=False,
        )
        return {
            "insights": get_project_diary_insights(project),
            "entries_count": entries.count(),
            "issues_reported": sum(1 for entry in entries if entry.has_issues),
        }

    if report_type == ReportType.SAFETY_INCIDENTS:
        entries = SiteDiaryEntry.objects.filter(
            company=project.company,
            project=project,
            entry_date__gte=date_from,
            entry_date__lte=date_to,
            is_deleted=False,
        )
        incidents = [
            {
                "entry_id": str(entry.id),
                "entry_date": entry.entry_date.isoformat(),
                "safety_concerns": entry.safety_concerns,
                "required_actions": entry.required_actions,
            }
            for entry in entries
            if entry.safety_concerns.strip()
        ]
        return {"incidents": incidents, "count": len(incidents)}

    if report_type == ReportType.CUSTOM:
        tasks = Task.objects.filter(company=project.company, project=project, is_deleted=False)
        return {
            "task_counts": {
                "all": tasks.count(),
                "todo": tasks.filter(status=TaskStatus.TODO).count(),
                "in_progress": tasks.filter(status=TaskStatus.IN_PROGRESS).count(),
                "done": tasks.filter(status=TaskStatus.DONE).count(),
            },
            "high_priority_tasks": tasks.filter(priority=TaskPriority.HIGH).count(),
        }

    raise AmaniBuildAPIException("Unsupported report type.", code="invalid_report_type")


def create_generated_report(*, company: Company, user, report_type: str, title: str, project=None, date_from=None, date_to=None, output_format="json") -> GeneratedReport:
    payload = get_project_report_data(project, report_type, date_from=date_from, date_to=date_to) if project else get_portfolio_analytics(company)
    return GeneratedReport.objects.create(
        company=company,
        project=project,
        report_type=report_type,
        title=title,
        generated_by=user,
        date_from=date_from,
        date_to=date_to,
        output_format=output_format,
        payload=payload,
    )

