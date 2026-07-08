"""Versioned API URL routing."""

from django.urls import include, path

urlpatterns = [
    path("", include("apps.core.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.companies.urls")),
    path("", include("apps.projects.urls")),
    path("", include("apps.diary.urls")),
    path("", include("apps.attendance.urls")),
    path("", include("apps.procurement.urls")),
    path("", include("apps.inventory.urls")),
    path("", include("apps.tasks.urls")),
    path("", include("apps.documents.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.messaging.urls")),
    path("", include("apps.reports.urls")),
    path("", include("apps.inspections.urls")),
    path("", include("apps.expenses.urls")),
    path("", include("apps.client_portal.urls")),
    path("", include("apps.scheduling.urls")),
]
