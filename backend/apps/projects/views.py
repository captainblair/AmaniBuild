"""Project API views."""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.models import Site
from apps.companies.permissions import CanManageProjects, HasCompanyAccess
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.projects.models import Project, ProjectStatus, ProjectType
from apps.projects.serializers import (
    ProjectCreateUpdateSerializer,
    ProjectListSerializer,
    ProjectSerializer,
)
from apps.projects.services import (
    assert_can_add_project,
    validate_project_manager,
    validate_project_site,
)

User = get_user_model()


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _project_queryset(company):
    return (
        Project.objects.filter(company=company, is_deleted=False)
        .select_related("site", "project_manager")
        .order_by("-created_at")
    )


def _apply_project_filters(queryset, request):
    status_filter = request.query_params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    site_id = request.query_params.get("site_id")
    if site_id:
        queryset = queryset.filter(site_id=site_id)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(client_name__icontains=search)
            | Q(site__name__icontains=search)
        )

    ordering = request.query_params.get("ordering", "-created_at")
    allowed = {
        "name",
        "-name",
        "status",
        "-status",
        "planned_start_date",
        "-planned_start_date",
        "budget_total",
        "-budget_total",
        "progress_percent",
        "-progress_percent",
        "created_at",
        "-created_at",
    }
    if ordering in allowed:
        queryset = queryset.order_by(ordering)
    return queryset


def _get_project_or_404(company, project_id) -> Project:
    project = _project_queryset(company).filter(id=project_id).first()
    if not project:
        raise AmaniBuildAPIException("Project not found.", code="not_found")
    return project


def _resolve_site(company, site_id):
    if not site_id:
        return None
    site = Site.objects.filter(company=company, id=site_id, is_deleted=False).first()
    if not site:
        raise AmaniBuildAPIException("Site not found.", code="not_found")
    return site


def _resolve_manager(company, manager_id):
    if not manager_id:
        return None
    user = User.objects.filter(id=manager_id).first()
    if not user:
        raise AmaniBuildAPIException("Project manager not found.", code="not_found")
    validate_project_manager(company, user)
    return user


def _build_project(company, data: dict) -> Project:
    site = _resolve_site(company, data.get("site_id"))
    validate_project_site(company, site)
    manager = _resolve_manager(company, data.get("project_manager_id"))

    return Project.objects.create(
        company=company,
        site=site,
        name=data["name"],
        code=data.get("code", ""),
        project_type=data.get("project_type", ProjectType.RESIDENTIAL),
        status=data.get("status", ProjectStatus.PLANNING),
        description=data.get("description", ""),
        client_name=data.get("client_name", ""),
        client_email=data.get("client_email", ""),
        client_phone=data.get("client_phone", ""),
        budget_total=data.get("budget_total", 0),
        budget_spent=data.get("budget_spent", 0),
        currency=data.get("currency", "KES"),
        planned_start_date=data.get("planned_start_date"),
        planned_end_date=data.get("planned_end_date"),
        actual_start_date=data.get("actual_start_date"),
        actual_end_date=data.get("actual_end_date"),
        progress_percent=data.get("progress_percent", 0),
        project_manager=manager,
    )


def _update_project_fields(project: Project, data: dict) -> Project:
    if "site_id" in data:
        site = _resolve_site(project.company, data.get("site_id"))
        validate_project_site(project.company, site)
        project.site = site

    if "project_manager_id" in data:
        manager = _resolve_manager(project.company, data.get("project_manager_id"))
        project.project_manager = manager

    scalar_fields = (
        "name",
        "code",
        "project_type",
        "status",
        "description",
        "client_name",
        "client_email",
        "client_phone",
        "budget_total",
        "budget_spent",
        "currency",
        "planned_start_date",
        "planned_end_date",
        "actual_start_date",
        "actual_end_date",
        "progress_percent",
    )
    for field in scalar_fields:
        if field in data:
            setattr(project, field, data[field])

    if "name" in data:
        project.slug = ""

    project.save()
    return project


def _overview_summary(project: Project) -> dict:
    from django.utils import timezone

    today = timezone.localdate()
    days_remaining = None
    if project.planned_end_date:
        days_remaining = (project.planned_end_date - today).days

    return {
        "status": project.status,
        "progress_percent": project.progress_percent,
        "budget_total": str(project.budget_total),
        "budget_spent": str(project.budget_spent),
        "budget_remaining": str(project.budget_remaining),
        "budget_utilization_percent": project.budget_utilization_percent,
        "days_remaining": days_remaining,
        "has_site": project.site_id is not None,
        "team_members_count": 0,
    }


class ProjectListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageProjects()]
        return [IsAuthenticated(), HasCompanyAccess()]

    @extend_schema(tags=["Projects"])
    def get(self, request):
        queryset = _apply_project_filters(_project_queryset(request.company), request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ProjectListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=ProjectCreateUpdateSerializer, tags=["Projects"])
    def post(self, request):
        serializer = ProjectCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assert_can_add_project(request.company)
        project = _build_project(request.company, serializer.validated_data)
        return _success({"project": ProjectSerializer(project).data}, status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    def get_permissions(self):
        if self.request.method in {"PATCH", "DELETE"}:
            return [IsAuthenticated(), CanManageProjects()]
        return [IsAuthenticated(), HasCompanyAccess()]

    @extend_schema(tags=["Projects"])
    def get(self, request, project_id):
        project = _get_project_or_404(request.company, project_id)
        return _success({"project": ProjectSerializer(project).data})

    @extend_schema(request=ProjectCreateUpdateSerializer, tags=["Projects"])
    def patch(self, request, project_id):
        project = _get_project_or_404(request.company, project_id)
        serializer = ProjectCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        project = _update_project_fields(project, serializer.validated_data)
        return _success({"project": ProjectSerializer(project).data})

    @extend_schema(tags=["Projects"])
    def delete(self, request, project_id):
        project = _get_project_or_404(request.company, project_id)
        project.soft_delete()
        return _success({"message": "Project archived."})


class ProjectOverviewView(APIView):
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    @extend_schema(tags=["Projects"])
    def get(self, request, project_id):
        project = _get_project_or_404(request.company, project_id)
        return _success(
            {
                "project": ProjectSerializer(project).data,
                "summary": _overview_summary(project),
            }
        )
