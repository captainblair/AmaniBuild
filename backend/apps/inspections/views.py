"""Inspection API views."""

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanApproveInspections, CanManageInspections, CanViewInspections
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.diary.services import get_project_for_company
from apps.inspections.models import Inspection
from apps.inspections.serializers import (
    InspectionCreateUpdateSerializer,
    InspectionListSerializer,
    InspectionReviewSerializer,
    InspectionSerializer,
)
from apps.inspections.services import (
    create_inspection,
    get_checklist_templates,
    get_inspection_dashboard,
    review_inspection,
    start_inspection,
    submit_inspection,
    update_inspection,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _inspection_queryset(company):
    return (
        Inspection.objects.filter(company=company, is_deleted=False)
        .select_related("project", "inspector", "reviewed_by", "created_by")
        .order_by("-scheduled_date", "-created_at")
    )


def _get_inspection_or_404(company, inspection_id) -> Inspection:
    inspection = _inspection_queryset(company).filter(id=inspection_id).first()
    if not inspection:
        raise AmaniBuildAPIException("Inspection not found.", code="not_found")
    return inspection


def _apply_filters(queryset, request):
    status_filter = request.query_params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    inspection_type = request.query_params.get("inspection_type")
    if inspection_type:
        queryset = queryset.filter(inspection_type=inspection_type)

    project_id = request.query_params.get("project_id")
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(inspection_number__icontains=search)
            | Q(area_location__icontains=search)
            | Q(description__icontains=search)
        )
    return queryset


class InspectionTemplateListView(APIView):
    permission_classes = [IsAuthenticated, CanViewInspections]

    @extend_schema(tags=["Inspections"])
    def get(self, request):
        return _success({"templates": get_checklist_templates()})


class InspectionDashboardView(APIView):
    permission_classes = [IsAuthenticated, CanViewInspections]

    @extend_schema(tags=["Inspections"])
    def get(self, request):
        project_id = request.query_params.get("project_id")
        return _success({"dashboard": get_inspection_dashboard(request.company, project_id)})


class InspectionListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageInspections()]
        return [IsAuthenticated(), CanViewInspections()]

    @extend_schema(tags=["Inspections"])
    def get(self, request):
        queryset = _apply_filters(_inspection_queryset(request.company), request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = InspectionListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=["Inspections"])
    def post(self, request):
        serializer = InspectionCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project_id = request.data.get("project_id")
        if not project_id:
            raise AmaniBuildAPIException("project_id is required.", code="validation_error")
        project = get_project_for_company(request.company, project_id)
        inspection = create_inspection(
            company=request.company,
            project=project,
            user=request.user,
            data=serializer.validated_data,
        )
        return _success(
            {"inspection": InspectionSerializer(inspection).data},
            status_code=status.HTTP_201_CREATED,
        )


class ProjectInspectionListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageInspections()]
        return [IsAuthenticated(), CanViewInspections()]

    @extend_schema(tags=["Inspections"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        queryset = _apply_filters(
            _inspection_queryset(request.company).filter(project=project),
            request,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = InspectionListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=["Inspections"])
    def post(self, request, project_id):
        serializer = InspectionCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_project_for_company(request.company, project_id)
        inspection = create_inspection(
            company=request.company,
            project=project,
            user=request.user,
            data=serializer.validated_data,
        )
        return _success(
            {"inspection": InspectionSerializer(inspection).data},
            status_code=status.HTTP_201_CREATED,
        )


class InspectionDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewInspections()]
        return [IsAuthenticated(), CanManageInspections()]

    @extend_schema(tags=["Inspections"])
    def get(self, request, inspection_id):
        inspection = _get_inspection_or_404(request.company, inspection_id)
        return _success({"inspection": InspectionSerializer(inspection).data})

    @extend_schema(tags=["Inspections"])
    def patch(self, request, inspection_id):
        inspection = _get_inspection_or_404(request.company, inspection_id)
        serializer = InspectionCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        inspection = update_inspection(inspection, serializer.validated_data)
        return _success({"inspection": InspectionSerializer(inspection).data})

    @extend_schema(tags=["Inspections"])
    def delete(self, request, inspection_id):
        inspection = _get_inspection_or_404(request.company, inspection_id)
        inspection.soft_delete()
        return _success({"deleted": True})


class InspectionStartView(APIView):
    permission_classes = [IsAuthenticated, CanManageInspections]

    @extend_schema(tags=["Inspections"])
    def post(self, request, inspection_id):
        inspection = _get_inspection_or_404(request.company, inspection_id)
        inspection = start_inspection(inspection)
        return _success({"inspection": InspectionSerializer(inspection).data})


class InspectionSubmitView(APIView):
    permission_classes = [IsAuthenticated, CanManageInspections]

    @extend_schema(tags=["Inspections"])
    def post(self, request, inspection_id):
        inspection = _get_inspection_or_404(request.company, inspection_id)
        inspection = submit_inspection(inspection)
        return _success({"inspection": InspectionSerializer(inspection).data})


class InspectionReviewView(APIView):
    permission_classes = [IsAuthenticated, CanApproveInspections]

    @extend_schema(tags=["Inspections"])
    def post(self, request, inspection_id):
        inspection = _get_inspection_or_404(request.company, inspection_id)
        serializer = InspectionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inspection = review_inspection(
            inspection,
            request.user,
            result=serializer.validated_data["result"],
            notes=serializer.validated_data.get("notes", ""),
        )
        return _success({"inspection": InspectionSerializer(inspection).data})
