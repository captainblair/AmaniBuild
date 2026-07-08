"""Client portal API views."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.client_portal.models import ClientProjectAccess
from apps.client_portal.serializers import ClientAccessGrantSerializer
from apps.client_portal.services import (
    assert_client_project_access,
    get_client_dashboard,
    get_client_milestones,
    get_client_photos,
    get_client_project_list,
    get_client_project_overview,
    get_client_timeline,
    get_project_for_company,
    grant_client_access,
    revoke_client_access,
)
from apps.companies.permissions import CanAccessClientPortal, CanManageProjects
from apps.core.exceptions import AmaniBuildAPIException

User = get_user_model()


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _serialize_access_row(access: ClientProjectAccess) -> dict:
    return {
        "id": str(access.id),
        "client_user_id": str(access.client_user_id),
        "client_user_name": access.client_user.full_name,
        "client_user_email": access.client_user.email,
        "can_view_budget": access.can_view_budget,
        "is_active": access.is_active,
        "granted_at": access.created_at,
    }


class ClientPortalDashboardView(APIView):
    permission_classes = [IsAuthenticated, CanAccessClientPortal]

    @extend_schema(tags=["Client Portal"])
    def get(self, request):
        return _success({"dashboard": get_client_dashboard(request.user, request.company)})


class ClientPortalProjectListView(APIView):
    permission_classes = [IsAuthenticated, CanAccessClientPortal]

    @extend_schema(tags=["Client Portal"])
    def get(self, request):
        return _success({"projects": get_client_project_list(request.user, request.company)})


class ClientPortalProjectOverviewView(APIView):
    permission_classes = [IsAuthenticated, CanAccessClientPortal]

    @extend_schema(tags=["Client Portal"])
    def get(self, request, project_id):
        access = assert_client_project_access(request.user, request.company, project_id)
        return _success({"overview": get_client_project_overview(access)})


class ClientPortalProjectTimelineView(APIView):
    permission_classes = [IsAuthenticated, CanAccessClientPortal]

    @extend_schema(tags=["Client Portal"])
    def get(self, request, project_id):
        access = assert_client_project_access(request.user, request.company, project_id)
        return _success({"timeline": get_client_timeline(access.project)})


class ClientPortalProjectPhotosView(APIView):
    permission_classes = [IsAuthenticated, CanAccessClientPortal]

    @extend_schema(tags=["Client Portal"])
    def get(self, request, project_id):
        access = assert_client_project_access(request.user, request.company, project_id)
        return _success({"photos": get_client_photos(access.project)})


class ClientPortalProjectMilestonesView(APIView):
    permission_classes = [IsAuthenticated, CanAccessClientPortal]

    @extend_schema(tags=["Client Portal"])
    def get(self, request, project_id):
        access = assert_client_project_access(request.user, request.company, project_id)
        return _success({"milestones": get_client_milestones(access.project)})


class ProjectClientAccessListCreateView(APIView):
    permission_classes = [IsAuthenticated, CanManageProjects]

    @extend_schema(tags=["Client Portal"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        grants = ClientProjectAccess.objects.filter(
            company=request.company,
            project=project,
            is_active=True,
            is_deleted=False,
        ).select_related("client_user")
        return _success({"access_grants": [_serialize_access_row(g) for g in grants]})

    @extend_schema(tags=["Client Portal"])
    def post(self, request, project_id):
        serializer = ClientAccessGrantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_project_for_company(request.company, project_id)
        client_user = User.objects.filter(id=serializer.validated_data["client_user_id"]).first()
        if not client_user:
            raise AmaniBuildAPIException("Client user not found.", code="not_found")
        access = grant_client_access(
            company=request.company,
            project=project,
            client_user=client_user,
            granted_by=request.user,
            can_view_budget=serializer.validated_data.get("can_view_budget", True),
        )
        return _success(
            {"access_grant": _serialize_access_row(access)},
            status_code=status.HTTP_201_CREATED,
        )


class ProjectClientAccessRevokeView(APIView):
    permission_classes = [IsAuthenticated, CanManageProjects]

    @extend_schema(tags=["Client Portal"])
    def delete(self, request, project_id, client_user_id):
        project = get_project_for_company(request.company, project_id)
        revoke_client_access(request.company, project, client_user_id)
        return _success({"revoked": True})
