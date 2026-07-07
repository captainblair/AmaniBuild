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
]
