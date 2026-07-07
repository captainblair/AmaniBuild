"""Project URL routes."""

from django.urls import path

from apps.projects.views import ProjectDetailView, ProjectListCreateView, ProjectOverviewView

urlpatterns = [
    path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    path("projects/<uuid:project_id>/", ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<uuid:project_id>/overview/", ProjectOverviewView.as_view(), name="project-overview"),
]
