"""Core URL routes."""

from django.urls import path

from apps.core.views import APIRootView, HealthCheckView

urlpatterns = [
    path("", APIRootView.as_view(), name="api-root"),
    path("health/", HealthCheckView.as_view(), name="health-check"),
]
