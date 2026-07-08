"""Scheduling URL routes."""

from django.urls import path

from apps.scheduling.views import (
    ProjectScheduleDashboardView,
    ProjectScheduleGanttView,
    ProjectScheduleItemListCreateView,
    ProjectSchedulePhaseListCreateView,
    ScheduleDependencyCreateView,
    ScheduleDependencyDeleteView,
    ScheduleItemDetailView,
    ScheduleItemSyncTaskView,
)

urlpatterns = [
    path("projects/<uuid:project_id>/schedule/gantt/", ProjectScheduleGanttView.as_view(), name="project-schedule-gantt"),
    path(
        "projects/<uuid:project_id>/schedule/dashboard/",
        ProjectScheduleDashboardView.as_view(),
        name="project-schedule-dashboard",
    ),
    path(
        "projects/<uuid:project_id>/schedule/phases/",
        ProjectSchedulePhaseListCreateView.as_view(),
        name="project-schedule-phases",
    ),
    path(
        "projects/<uuid:project_id>/schedule/items/",
        ProjectScheduleItemListCreateView.as_view(),
        name="project-schedule-items",
    ),
    path(
        "projects/<uuid:project_id>/schedule/dependencies/",
        ScheduleDependencyCreateView.as_view(),
        name="project-schedule-dependencies",
    ),
    path("schedule/items/<uuid:item_id>/", ScheduleItemDetailView.as_view(), name="schedule-item-detail"),
    path("schedule/items/<uuid:item_id>/sync-task/", ScheduleItemSyncTaskView.as_view(), name="schedule-item-sync-task"),
    path(
        "schedule/dependencies/<int:dependency_id>/",
        ScheduleDependencyDeleteView.as_view(),
        name="schedule-dependency-delete",
    ),
]
