"""Reports URL routes."""

from django.urls import path

from apps.reports.views import (
    GeneratedReportDetailView,
    GeneratedReportListCreateView,
    PortfolioAnalyticsView,
    ProjectAnalyticsView,
    ReportTemplateListView,
)

urlpatterns = [
    path("reports/templates/", ReportTemplateListView.as_view(), name="report-templates"),
    path("reports/analytics/", PortfolioAnalyticsView.as_view(), name="portfolio-analytics"),
    path("projects/<uuid:project_id>/analytics/", ProjectAnalyticsView.as_view(), name="project-analytics"),
    path("reports/generated/", GeneratedReportListCreateView.as_view(), name="generated-report-list"),
    path("reports/generated/<uuid:report_id>/", GeneratedReportDetailView.as_view(), name="generated-report-detail"),
]

