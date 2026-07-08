"""Inspection URL routes."""

from django.urls import path

from apps.inspections.views import (
    InspectionDashboardView,
    InspectionDetailView,
    InspectionListCreateView,
    InspectionReviewView,
    InspectionStartView,
    InspectionSubmitView,
    InspectionTemplateListView,
    ProjectInspectionListCreateView,
)

urlpatterns = [
    path("inspections/templates/", InspectionTemplateListView.as_view(), name="inspection-templates"),
    path("inspections/dashboard/", InspectionDashboardView.as_view(), name="inspection-dashboard"),
    path("inspections/", InspectionListCreateView.as_view(), name="inspection-list"),
    path("inspections/<uuid:inspection_id>/", InspectionDetailView.as_view(), name="inspection-detail"),
    path("inspections/<uuid:inspection_id>/start/", InspectionStartView.as_view(), name="inspection-start"),
    path("inspections/<uuid:inspection_id>/submit/", InspectionSubmitView.as_view(), name="inspection-submit"),
    path("inspections/<uuid:inspection_id>/review/", InspectionReviewView.as_view(), name="inspection-review"),
    path(
        "projects/<uuid:project_id>/inspections/",
        ProjectInspectionListCreateView.as_view(),
        name="project-inspection-list",
    ),
]
