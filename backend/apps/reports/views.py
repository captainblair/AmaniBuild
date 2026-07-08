"""Reports and analytics API views."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanViewReports
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.reports.models import GeneratedReport
from apps.reports.serializers import GeneratedReportSerializer, ReportGenerateSerializer
from apps.reports.services import (
    create_generated_report,
    get_portfolio_analytics,
    get_project_for_company,
    get_project_report_data,
    get_report_templates,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


class ReportTemplateListView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]

    @extend_schema(tags=["Reports"])
    def get(self, request):
        return _success({"templates": get_report_templates()})


class PortfolioAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]

    @extend_schema(tags=["Reports"])
    def get(self, request):
        return _success({"analytics": get_portfolio_analytics(request.company)})


class ProjectAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]

    @extend_schema(tags=["Reports"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        report_type = request.query_params.get("report_type", "progress")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        return _success(
            {
                "project": {"id": str(project.id), "name": project.name},
                "analytics": get_project_report_data(project, report_type, date_from=date_from, date_to=date_to),
            }
        )


class GeneratedReportListCreateView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]
    pagination_class = StandardResultsPagination

    @extend_schema(tags=["Reports"])
    def get(self, request):
        queryset = GeneratedReport.objects.filter(company=request.company, is_deleted=False).select_related(
            "project",
            "generated_by",
        )
        report_type = request.query_params.get("report_type")
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at"), request)
        return paginator.get_paginated_response(GeneratedReportSerializer(page, many=True).data)

    @extend_schema(request=ReportGenerateSerializer, tags=["Reports"])
    def post(self, request):
        serializer = ReportGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = None
        if serializer.validated_data.get("project_id"):
            project = get_project_for_company(request.company, serializer.validated_data["project_id"])
        title = serializer.validated_data.get("title") or dict(serializer.fields["report_type"].choices).get(
            serializer.validated_data["report_type"],
            "Generated Report",
        )
        report = create_generated_report(
            company=request.company,
            user=request.user,
            report_type=serializer.validated_data["report_type"],
            title=title,
            project=project,
            date_from=serializer.validated_data.get("date_from"),
            date_to=serializer.validated_data.get("date_to"),
            output_format=serializer.validated_data.get("output_format", "json"),
        )
        return _success({"report": GeneratedReportSerializer(report).data}, status.HTTP_201_CREATED)


class GeneratedReportDetailView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]

    @extend_schema(tags=["Reports"])
    def get(self, request, report_id):
        report = (
            GeneratedReport.objects.filter(company=request.company, id=report_id, is_deleted=False)
            .select_related("project", "generated_by")
            .first()
        )
        if not report:
            raise AmaniBuildAPIException("Report not found.", code="not_found")
        return _success({"report": GeneratedReportSerializer(report).data})

