"""Task URL routes."""

from django.urls import path

from apps.tasks.views import (
    MyTasksView,
    ProjectTaskBoardView,
    ProjectTaskListCreateView,
    TaskBoardView,
    TaskCommentListCreateView,
    TaskDetailView,
    TaskListCreateView,
    TaskStatusView,
)

urlpatterns = [
    path("tasks/board/", TaskBoardView.as_view(), name="task-board"),
    path("tasks/", TaskListCreateView.as_view(), name="task-list"),
    path("tasks/my/", MyTasksView.as_view(), name="my-tasks"),
    path("tasks/<uuid:task_id>/", TaskDetailView.as_view(), name="task-detail"),
    path("tasks/<uuid:task_id>/status/", TaskStatusView.as_view(), name="task-status"),
    path(
        "tasks/<uuid:task_id>/comments/",
        TaskCommentListCreateView.as_view(),
        name="task-comments",
    ),
    path(
        "projects/<uuid:project_id>/tasks/",
        ProjectTaskListCreateView.as_view(),
        name="project-task-list",
    ),
    path(
        "projects/<uuid:project_id>/tasks/board/",
        ProjectTaskBoardView.as_view(),
        name="project-task-board",
    ),
]
