"""Client portal URL routes."""

from django.urls import path

from apps.client_portal.views import (
    ClientPortalDashboardView,
    ClientPortalProjectListView,
    ClientPortalProjectMilestonesView,
    ClientPortalProjectOverviewView,
    ClientPortalProjectPhotosView,
    ClientPortalProjectTimelineView,
    ProjectClientAccessListCreateView,
    ProjectClientAccessRevokeView,
)

urlpatterns = [
    path("client-portal/dashboard/", ClientPortalDashboardView.as_view(), name="client-portal-dashboard"),
    path("client-portal/projects/", ClientPortalProjectListView.as_view(), name="client-portal-projects"),
    path(
        "client-portal/projects/<uuid:project_id>/",
        ClientPortalProjectOverviewView.as_view(),
        name="client-portal-project-overview",
    ),
    path(
        "client-portal/projects/<uuid:project_id>/timeline/",
        ClientPortalProjectTimelineView.as_view(),
        name="client-portal-project-timeline",
    ),
    path(
        "client-portal/projects/<uuid:project_id>/photos/",
        ClientPortalProjectPhotosView.as_view(),
        name="client-portal-project-photos",
    ),
    path(
        "client-portal/projects/<uuid:project_id>/milestones/",
        ClientPortalProjectMilestonesView.as_view(),
        name="client-portal-project-milestones",
    ),
    path(
        "projects/<uuid:project_id>/client-access/",
        ProjectClientAccessListCreateView.as_view(),
        name="project-client-access",
    ),
    path(
        "projects/<uuid:project_id>/client-access/<uuid:client_user_id>/",
        ProjectClientAccessRevokeView.as_view(),
        name="project-client-access-revoke",
    ),
]
