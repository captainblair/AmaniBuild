"""Site diary business logic."""

from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.companies.models import Company, CompanyMembership
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.models import DiaryEntryStatus, SiteDiaryEntry
from apps.projects.models import Project


def get_project_for_company(company: Company, project_id) -> Project:
    project = Project.objects.filter(company=company, id=project_id, is_deleted=False).first()
    if not project:
        raise AmaniBuildAPIException("Project not found.", code="not_found")
    return project


def assert_valid_supervisor(company: Company, user) -> None:
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
            "Supervisor must be an active company member.",
            code="invalid_supervisor",
        )


def assert_unique_entry_date(project: Project, entry_date, exclude_id=None) -> None:
    qs = SiteDiaryEntry.objects.filter(project=project, entry_date=entry_date, is_deleted=False)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    if qs.exists():
        raise AmaniBuildAPIException(
            "A diary entry already exists for this project on this date.",
            code="duplicate_entry",
        )


def assert_editable(entry: SiteDiaryEntry) -> None:
    if entry.status != DiaryEntryStatus.DRAFT:
        raise AmaniBuildAPIException(
            "Only draft diary entries can be edited.",
            code="invalid_status",
        )


def submit_diary_entry(entry: SiteDiaryEntry) -> SiteDiaryEntry:
    if entry.status != DiaryEntryStatus.DRAFT:
        raise AmaniBuildAPIException("Only draft entries can be submitted.", code="invalid_status")
    entry.status = DiaryEntryStatus.SUBMITTED
    entry.submitted_at = timezone.now()
    entry.save(update_fields=["status", "submitted_at", "updated_at"])
    return entry


def approve_diary_entry(entry: SiteDiaryEntry, approver) -> SiteDiaryEntry:
    if entry.status != DiaryEntryStatus.SUBMITTED:
        raise AmaniBuildAPIException("Only submitted entries can be approved.", code="invalid_status")
    entry.status = DiaryEntryStatus.APPROVED
    entry.approved_at = timezone.now()
    entry.approved_by = approver
    entry.save(update_fields=["status", "approved_at", "approved_by", "updated_at"])
    return entry


def get_project_diary_insights(project: Project) -> dict:
    entries = SiteDiaryEntry.objects.filter(project=project, is_deleted=False)
    aggregates = entries.aggregate(
        total_entries=Count("id"),
        average_progress=Avg("progress_percent"),
        approved_entries=Count("id", filter=Q(status=DiaryEntryStatus.APPROVED)),
    )

    all_entries = list(entries.only("photos", "materials_consumed", "delays", "safety_concerns"))
    photos_count = sum(len(e.photos or []) for e in all_entries)
    materials_tracked = sum(len(e.materials_consumed or []) for e in all_entries)
    issues_count = sum(1 for e in all_entries if e.has_issues)
    weather_disruptions = entries.filter(
        weather_condition__in=["rainy", "extreme"],
    ).count()

    avg_progress = aggregates["average_progress"]
    return {
        "total_entries": aggregates["total_entries"] or 0,
        "approved_entries": aggregates["approved_entries"] or 0,
        "photos_uploaded": photos_count,
        "materials_tracked": materials_tracked,
        "issues_reported": issues_count,
        "average_daily_progress": round(float(avg_progress), 1) if avg_progress else 0.0,
        "weather_disruption_days": weather_disruptions,
    }
