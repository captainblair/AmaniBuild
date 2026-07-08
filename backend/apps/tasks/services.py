"""Task board business logic."""

from django.db.models import Count, Q
from django.utils import timezone

from apps.companies.models import Company, CompanyMembership
from apps.companies.rbac import MANAGE_TASKS
from apps.companies.services import user_has_company_permission
from apps.core.exceptions import AmaniBuildAPIException
from apps.projects.models import Project
from apps.tasks.models import Task, TaskComment, TaskPriority, TaskStatus


def get_project_for_company(company: Company, project_id) -> Project:
    project = Project.objects.filter(company=company, id=project_id, is_deleted=False).first()
    if not project:
        raise AmaniBuildAPIException("Project not found.", code="not_found")
    return project


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


def get_task_or_404(company: Company, task_id) -> Task:
    task = (
        Task.objects.filter(company=company, id=task_id, is_deleted=False)
        .select_related("project", "assignee", "created_by")
        .first()
    )
    if not task:
        raise AmaniBuildAPIException("Task not found.", code="not_found")
    return task


def user_can_manage_task(user, company: Company, task: Task) -> bool:
    return user_has_company_permission(user, company, MANAGE_TASKS)


def user_can_update_task_status(user, company: Company, task: Task) -> bool:
    if user_can_manage_task(user, company, task):
        return True
    return task.assignee_id == user.id


def apply_task_filters(queryset, request):
    project_id = request.query_params.get("project_id")
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    assignee_id = request.query_params.get("assignee_id")
    if assignee_id:
        queryset = queryset.filter(assignee_id=assignee_id)

    priority = request.query_params.get("priority")
    if priority:
        queryset = queryset.filter(priority=priority)

    status_filter = request.query_params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    return queryset


def create_task(company: Company, user, data: dict) -> Task:
    project = get_project_for_company(company, data["project_id"])
    assignee = None
    if data.get("assignee_id"):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        assignee = User.objects.filter(id=data["assignee_id"]).first()
        if not assignee:
            raise AmaniBuildAPIException("Assignee not found.", code="not_found")
        assert_valid_assignee(company, assignee)

    return Task.objects.create(
        company=company,
        project=project,
        title=data["title"],
        description=data.get("description", ""),
        status=data.get("status", TaskStatus.TODO),
        priority=data.get("priority", TaskPriority.MEDIUM),
        due_date=data.get("due_date"),
        assignee=assignee,
        board_position=data.get("board_position", 0),
        attachments=data.get("attachments", []),
        created_by=user,
    )


def update_task(task: Task, company: Company, data: dict) -> Task:
    if "project_id" in data:
        task.project = get_project_for_company(company, data["project_id"])

    if "assignee_id" in data:
        assignee_id = data.get("assignee_id")
        if assignee_id:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            assignee = User.objects.filter(id=assignee_id).first()
            if not assignee:
                raise AmaniBuildAPIException("Assignee not found.", code="not_found")
            assert_valid_assignee(company, assignee)
            task.assignee = assignee
        else:
            task.assignee = None

    scalar_fields = ("title", "description", "priority", "due_date", "board_position", "attachments")
    for field in scalar_fields:
        if field in data:
            setattr(task, field, data[field])

    if "status" in data:
        update_task_status(task, data["status"])

    task.save()
    return task


def update_task_status(task: Task, new_status: str, *, user=None, company=None) -> Task:
    if new_status not in TaskStatus.values:
        raise AmaniBuildAPIException("Invalid task status.", code="invalid_status")

    if user and company and not user_can_update_task_status(user, company, task):
        raise AmaniBuildAPIException(
            "You do not have permission to update this task.",
            code="forbidden",
        )

    if task.assignee_id and user and company:
        if not user_can_manage_task(user, company, task):
            allowed = {TaskStatus.IN_PROGRESS, TaskStatus.DONE}
            if new_status not in allowed:
                raise AmaniBuildAPIException(
                    "Assignees can only move tasks to in progress or done.",
                    code="invalid_status",
                )

    task.status = new_status
    if new_status == TaskStatus.DONE:
        task.completed_at = timezone.now()
    else:
        task.completed_at = None
    task.save(update_fields=["status", "completed_at", "updated_at"])
    return task


def get_task_board(company: Company, queryset) -> dict:
    columns = []
    status_counts = queryset.values("status").annotate(count=Count("id"))
    counts_map = {row["status"]: row["count"] for row in status_counts}

    for status_value, status_label in TaskStatus.choices:
        column_tasks = queryset.filter(status=status_value).order_by("board_position", "-created_at")
        from apps.tasks.serializers import TaskBoardCardSerializer

        columns.append(
            {
                "status": status_value,
                "label": status_label,
                "count": counts_map.get(status_value, 0),
                "tasks": TaskBoardCardSerializer(column_tasks, many=True).data,
            }
        )

    return {
        "columns": columns,
        "totals": {
            "all": queryset.count(),
            "todo": counts_map.get(TaskStatus.TODO, 0),
            "in_progress": counts_map.get(TaskStatus.IN_PROGRESS, 0),
            "done": counts_map.get(TaskStatus.DONE, 0),
        },
    }


def get_my_tasks_summary(user, company: Company) -> dict:
    queryset = Task.objects.filter(
        company=company,
        assignee=user,
        is_deleted=False,
    ).exclude(status=TaskStatus.DONE)

    return {
        "open_count": queryset.count(),
        "due_today": queryset.filter(due_date=timezone.localdate()).count(),
        "overdue": queryset.filter(due_date__lt=timezone.localdate()).count(),
        "high_priority": queryset.filter(priority=TaskPriority.HIGH).count(),
    }


def add_task_comment(task: Task, company: Company, user, body: str, attachments=None) -> TaskComment:
    return TaskComment.objects.create(
        company=company,
        task=task,
        author=user,
        body=body,
        attachments=attachments or [],
    )
