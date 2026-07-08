"""Client portal business logic."""

from django.db import transaction
from django.utils import timezone

from apps.companies.models import Company, CompanyMembership, CompanyRole
from apps.core.exceptions import AmaniBuildAPIException
from apps.client_portal.models import ClientProjectAccess
from apps.diary.models import DiaryEntryStatus, SiteDiaryEntry
from apps.documents.models import LibraryAssetType, LibraryItem
from apps.projects.models import Project
from apps.tasks.models import Task, TaskStatus


def get_project_for_company(company: Company, project_id) -> Project:
    project = Project.objects.filter(company=company, id=project_id, is_deleted=False).first()
    if not project:
        raise AmaniBuildAPIException("Project not found.", code="not_found")
    return project


def assert_client_user(company: Company, user) -> None:
    membership = CompanyMembership.objects.filter(
        company=company,
        user=user,
        role=CompanyRole.CLIENT,
        is_active=True,
        is_deleted=False,
    ).first()
    if not membership:
        raise AmaniBuildAPIException(
            "User must have the client role in this company.",
            code="invalid_client",
        )


def get_client_access(user, company: Company, project: Project) -> ClientProjectAccess | None:
    return ClientProjectAccess.objects.filter(
        company=company,
        project=project,
        client_user=user,
        is_active=True,
        is_deleted=False,
    ).first()


def assert_client_project_access(user, company: Company, project_id) -> ClientProjectAccess:
    project = get_project_for_company(company, project_id)
    access = get_client_access(user, company, project)
    if not access:
        exc = AmaniBuildAPIException("You do not have access to this project.", code="forbidden")
        exc.status_code = 403
        raise exc
    return access


def get_accessible_projects(user, company: Company):
    return (
        Project.objects.filter(
            company=company,
            is_deleted=False,
            client_access_grants__client_user=user,
            client_access_grants__is_active=True,
            client_access_grants__is_deleted=False,
        )
        .select_related("site", "project_manager")
        .distinct()
        .order_by("-created_at")
    )


@transaction.atomic
def grant_client_access(
    *,
    company: Company,
    project: Project,
    client_user,
    granted_by,
    can_view_budget: bool = True,
) -> ClientProjectAccess:
    assert_client_user(company, client_user)
    access, created = ClientProjectAccess.all_objects.update_or_create(
        project=project,
        client_user=client_user,
        defaults={
            "company": company,
            "can_view_budget": can_view_budget,
            "is_active": True,
            "is_deleted": False,
            "deleted_at": None,
            "granted_by": granted_by,
        },
    )
    if not created and access.is_deleted:
        access.restore()
    return access


def revoke_client_access(company: Company, project: Project, client_user_id) -> None:
    access = ClientProjectAccess.objects.filter(
        company=company,
        project=project,
        client_user_id=client_user_id,
        is_deleted=False,
    ).first()
    if not access:
        raise AmaniBuildAPIException("Client access grant not found.", code="not_found")
    access.is_active = False
    access.save(update_fields=["is_active", "updated_at"])


def _days_remaining(project: Project) -> int | None:
    if not project.planned_end_date:
        return None
    return (project.planned_end_date - timezone.localdate()).days


def get_client_project_list(user, company: Company) -> list[dict]:
    access_rows = (
        ClientProjectAccess.objects.filter(
            company=company,
            client_user=user,
            is_active=True,
            is_deleted=False,
        )
        .select_related("project", "project__site", "project__project_manager")
        .order_by("-project__created_at")
    )
    projects = []
    for access in access_rows:
        project = access.project
        if project.is_deleted:
            continue
        item = {
            "id": str(project.id),
            "name": project.name,
            "code": project.code,
            "status": project.status,
            "project_type": project.project_type,
            "progress_percent": project.progress_percent,
            "planned_start_date": project.planned_start_date.isoformat() if project.planned_start_date else None,
            "planned_end_date": project.planned_end_date.isoformat() if project.planned_end_date else None,
            "site_name": project.site.name if project.site_id else None,
            "project_manager_name": project.project_manager.full_name if project.project_manager_id else None,
            "days_remaining": _days_remaining(project),
        }
        if access.can_view_budget:
            item["budget_total"] = str(project.budget_total)
            item["budget_spent"] = str(project.budget_spent)
            item["currency"] = project.currency
        projects.append(item)
    return projects


def get_client_dashboard(user, company: Company) -> dict:
    projects = get_client_project_list(user, company)
    total_progress = 0
    if projects:
        total_progress = round(sum(p["progress_percent"] for p in projects) / len(projects), 1)

    return {
        "assigned_projects": len(projects),
        "average_progress": total_progress,
        "active_projects": sum(1 for p in projects if p["status"] == "active"),
        "completed_projects": sum(1 for p in projects if p["status"] == "completed"),
        "projects": projects,
    }


def get_client_project_overview(access: ClientProjectAccess) -> dict:
    project = access.project
    overview = {
        "id": str(project.id),
        "name": project.name,
        "code": project.code,
        "status": project.status,
        "project_type": project.project_type,
        "description": project.description,
        "progress_percent": project.progress_percent,
        "planned_start_date": project.planned_start_date.isoformat() if project.planned_start_date else None,
        "planned_end_date": project.planned_end_date.isoformat() if project.planned_end_date else None,
        "actual_start_date": project.actual_start_date.isoformat() if project.actual_start_date else None,
        "days_remaining": _days_remaining(project),
        "site_name": project.site.name if project.site_id else None,
        "project_manager_name": project.project_manager.full_name if project.project_manager_id else None,
        "currency": project.currency,
    }

    if access.can_view_budget:
        overview["budget"] = {
            "total": str(project.budget_total),
            "spent": str(project.budget_spent),
            "remaining": str(project.budget_remaining),
            "utilization_percent": project.budget_utilization_percent,
        }

    tasks = Task.objects.filter(company=project.company, project=project, is_deleted=False)
    diary = SiteDiaryEntry.objects.filter(
        company=project.company,
        project=project,
        status=DiaryEntryStatus.APPROVED,
        is_deleted=False,
    )

    overview["stats"] = {
        "tasks_total": tasks.count(),
        "tasks_completed": tasks.filter(status=TaskStatus.DONE).count(),
        "approved_diary_entries": diary.count(),
        "shared_photos": _count_shared_photos(project),
    }
    return overview


def _count_shared_photos(project: Project) -> int:
    library_photos = LibraryItem.objects.filter(
        company=project.company,
        project=project,
        asset_type=LibraryAssetType.PHOTO,
        is_archived=False,
        is_deleted=False,
    ).count()
    diary_photos = sum(
        len(entry.photos or [])
        for entry in SiteDiaryEntry.objects.filter(
            company=project.company,
            project=project,
            status=DiaryEntryStatus.APPROVED,
            is_deleted=False,
        ).only("photos")
    )
    return library_photos + diary_photos


def get_client_timeline(project: Project, limit: int = 20) -> list[dict]:
    entries = (
        SiteDiaryEntry.objects.filter(
            company=project.company,
            project=project,
            status=DiaryEntryStatus.APPROVED,
            is_deleted=False,
        )
        .order_by("-entry_date", "-created_at")[:limit]
    )
    return [
        {
            "id": str(entry.id),
            "entry_date": entry.entry_date.isoformat(),
            "title": f"Site update — {entry.entry_date.isoformat()}",
            "summary": entry.work_description[:280] if entry.work_description else "",
            "progress_percent": entry.progress_percent,
            "photo_count": len(entry.photos or []),
            "has_issues": entry.has_issues,
        }
        for entry in entries
    ]


def get_client_photos(project: Project, limit: int = 50) -> list[dict]:
    photos = []

    library_items = LibraryItem.objects.filter(
        company=project.company,
        project=project,
        asset_type=LibraryAssetType.PHOTO,
        is_archived=False,
        is_deleted=False,
        is_current_version=True,
    ).order_by("-captured_at", "-created_at")[:limit]

    for item in library_items:
        photos.append(
            {
                "id": str(item.id),
                "source": "library",
                "title": item.title,
                "url": item.file_url,
                "captured_at": item.captured_at.isoformat() if item.captured_at else item.created_at.isoformat(),
            }
        )

    remaining = limit - len(photos)
    if remaining > 0:
        entries = SiteDiaryEntry.objects.filter(
            company=project.company,
            project=project,
            status=DiaryEntryStatus.APPROVED,
            is_deleted=False,
        ).order_by("-entry_date")[:remaining]
        for entry in entries:
            for index, photo in enumerate(entry.photos or []):
                photos.append(
                    {
                        "id": f"{entry.id}-{index}",
                        "source": "diary",
                        "title": f"Site diary {entry.entry_date.isoformat()}",
                        "url": photo.get("url", ""),
                        "captured_at": entry.entry_date.isoformat(),
                    }
                )
                if len(photos) >= limit:
                    break
            if len(photos) >= limit:
                break

    return photos[:limit]


def get_client_milestones(project: Project) -> list[dict]:
    tasks = (
        Task.objects.filter(company=project.company, project=project, is_deleted=False)
        .select_related("assignee")
        .order_by("due_date", "-priority", "created_at")
    )
    return [
        {
            "id": str(task.id),
            "title": task.title,
            "status": task.status,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "assignee_name": task.assignee.full_name if task.assignee_id else None,
            "completed": task.status == TaskStatus.DONE,
        }
        for task in tasks
    ]
