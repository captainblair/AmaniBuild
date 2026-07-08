"""Task board API views."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanManageTasks, CanViewTasks
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.tasks.models import Task
from apps.tasks.serializers import (
    TaskCommentCreateSerializer,
    TaskCommentSerializer,
    TaskCreateUpdateSerializer,
    TaskListSerializer,
    TaskSerializer,
    TaskStatusUpdateSerializer,
)
from apps.tasks.services import (
    add_task_comment,
    apply_task_filters,
    create_task,
    get_my_tasks_summary,
    get_project_for_company,
    get_task_board,
    get_task_or_404,
    update_task,
    update_task_status,
    user_can_manage_task,
    user_can_update_task_status,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _task_queryset(company):
    return Task.objects.filter(company=company, is_deleted=False).select_related(
        "project",
        "project__site",
        "assignee",
        "created_by",
    )


class TaskBoardView(APIView):
    permission_classes = [IsAuthenticated, CanViewTasks]

    @extend_schema(tags=["Tasks"])
    def get(self, request):
        queryset = apply_task_filters(_task_queryset(request.company), request)
        return _success({"board": get_task_board(request.company, queryset)})


class ProjectTaskBoardView(APIView):
    permission_classes = [IsAuthenticated, CanViewTasks]

    @extend_schema(tags=["Tasks"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        queryset = apply_task_filters(
            _task_queryset(request.company).filter(project=project),
            request,
        )
        return _success({"board": get_task_board(request.company, queryset)})


class TaskListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageTasks()]
        return [IsAuthenticated(), CanViewTasks()]

    @extend_schema(tags=["Tasks"])
    def get(self, request):
        queryset = apply_task_filters(_task_queryset(request.company), request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at"), request)
        serializer = TaskListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=TaskCreateUpdateSerializer, tags=["Tasks"])
    def post(self, request):
        serializer = TaskCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "project_id" not in serializer.validated_data:
            raise AmaniBuildAPIException("project_id is required.", code="validation_error")
        if "title" not in serializer.validated_data:
            raise AmaniBuildAPIException("title is required.", code="validation_error")
        task = create_task(request.company, request.user, serializer.validated_data)
        return _success({"task": TaskSerializer(task).data}, status.HTTP_201_CREATED)


class ProjectTaskListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageTasks()]
        return [IsAuthenticated(), CanViewTasks()]

    @extend_schema(tags=["Tasks"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        queryset = apply_task_filters(
            _task_queryset(request.company).filter(project=project),
            request,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at"), request)
        serializer = TaskListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=TaskCreateUpdateSerializer, tags=["Tasks"])
    def post(self, request, project_id):
        get_project_for_company(request.company, project_id)
        serializer = TaskCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "title" not in serializer.validated_data:
            raise AmaniBuildAPIException("title is required.", code="validation_error")
        data = dict(serializer.validated_data)
        data["project_id"] = project_id
        task = create_task(request.company, request.user, data)
        return _success({"task": TaskSerializer(task).data}, status.HTTP_201_CREATED)


class MyTasksView(APIView):
    permission_classes = [IsAuthenticated, CanViewTasks]

    @extend_schema(tags=["Tasks"])
    def get(self, request):
        queryset = (
            _task_queryset(request.company)
            .filter(assignee=request.user)
            .order_by("due_date", "-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        open_only = request.query_params.get("open_only", "true").lower()
        if open_only in ("true", "1", "yes"):
            from apps.tasks.models import TaskStatus

            queryset = queryset.exclude(status=TaskStatus.DONE)

        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(queryset, request)
        response = paginator.get_paginated_response(TaskListSerializer(page, many=True).data)
        response.data["summary"] = get_my_tasks_summary(request.user, request.company)
        return response


class TaskDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewTasks()]
        return [IsAuthenticated(), CanManageTasks()]

    @extend_schema(tags=["Tasks"])
    def get(self, request, task_id):
        task = get_task_or_404(request.company, task_id)
        task = (
            Task.objects.filter(id=task.id)
            .select_related("project", "project__site", "assignee", "created_by")
            .prefetch_related("comments__author")
            .first()
        )
        return _success({"task": TaskSerializer(task).data})

    @extend_schema(request=TaskCreateUpdateSerializer, tags=["Tasks"])
    def patch(self, request, task_id):
        task = get_task_or_404(request.company, task_id)
        serializer = TaskCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        task = update_task(task, request.company, serializer.validated_data)
        return _success({"task": TaskSerializer(task).data})

    @extend_schema(tags=["Tasks"])
    def delete(self, request, task_id):
        task = get_task_or_404(request.company, task_id)
        task.soft_delete()
        return _success({"message": "Task deleted."})


class TaskStatusView(APIView):
    permission_classes = [IsAuthenticated, CanViewTasks]

    @extend_schema(request=TaskStatusUpdateSerializer, tags=["Tasks"])
    def post(self, request, task_id):
        task = get_task_or_404(request.company, task_id)
        if not user_can_update_task_status(request.user, request.company, task):
            raise AmaniBuildAPIException(
                "You do not have permission to update this task.",
                code="forbidden",
            )
        serializer = TaskStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = update_task_status(
            task,
            serializer.validated_data["status"],
            user=request.user,
            company=request.company,
        )
        if "board_position" in serializer.validated_data:
            task.board_position = serializer.validated_data["board_position"]
            task.save(update_fields=["board_position", "updated_at"])
        return _success({"task": TaskSerializer(task).data})


class TaskCommentListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanViewTasks()]
        return [IsAuthenticated(), CanViewTasks()]

    @extend_schema(tags=["Tasks"])
    def get(self, request, task_id):
        task = get_task_or_404(request.company, task_id)
        comments = task.comments.filter(is_deleted=False).select_related("author")
        return _success({"comments": TaskCommentSerializer(comments, many=True).data})

    @extend_schema(request=TaskCommentCreateSerializer, tags=["Tasks"])
    def post(self, request, task_id):
        task = get_task_or_404(request.company, task_id)
        can_comment = user_can_manage_task(request.user, request.company, task) or (
            task.assignee_id == request.user.id
        )
        if not can_comment:
            raise AmaniBuildAPIException(
                "You do not have permission to comment on this task.",
                code="forbidden",
            )
        serializer = TaskCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = add_task_comment(
            task,
            request.company,
            request.user,
            serializer.validated_data["body"],
            serializer.validated_data.get("attachments"),
        )
        return _success(
            {"comment": TaskCommentSerializer(comment).data},
            status.HTTP_201_CREATED,
        )
