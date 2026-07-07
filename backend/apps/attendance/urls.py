"""Attendance URL routes."""

from django.urls import path

from apps.attendance.views import (
    AttendanceClockView,
    AttendanceMeTodayView,
    AttendanceQRScanView,
    ProjectAttendanceAnalyticsView,
    ProjectAttendanceDashboardView,
    ProjectAttendanceMarkView,
    ProjectWorkerAssignmentListCreateView,
    SiteCheckInPointListCreateView,
    WorkerAttendanceHistoryView,
)

urlpatterns = [
    path(
        "projects/<uuid:project_id>/attendance/assignments/",
        ProjectWorkerAssignmentListCreateView.as_view(),
        name="project-attendance-assignments",
    ),
    path(
        "projects/<uuid:project_id>/attendance/dashboard/",
        ProjectAttendanceDashboardView.as_view(),
        name="project-attendance-dashboard",
    ),
    path(
        "projects/<uuid:project_id>/attendance/analytics/",
        ProjectAttendanceAnalyticsView.as_view(),
        name="project-attendance-analytics",
    ),
    path(
        "projects/<uuid:project_id>/attendance/mark/",
        ProjectAttendanceMarkView.as_view(),
        name="project-attendance-mark",
    ),
    path(
        "projects/<uuid:project_id>/attendance/workers/<uuid:worker_id>/history/",
        WorkerAttendanceHistoryView.as_view(),
        name="worker-attendance-history",
    ),
    path(
        "sites/<uuid:site_id>/check-in-points/",
        SiteCheckInPointListCreateView.as_view(),
        name="site-check-in-points",
    ),
    path("attendance/clock/", AttendanceClockView.as_view(), name="attendance-clock"),
    path("attendance/qr-scan/", AttendanceQRScanView.as_view(), name="attendance-qr-scan"),
    path("attendance/me/today/", AttendanceMeTodayView.as_view(), name="attendance-me-today"),
]
