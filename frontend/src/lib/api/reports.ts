import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  GeneratedReport,
  PaginatedResponse,
  PortfolioAnalytics,
  ProjectAnalyticsResponse,
  ReportGenerateInput,
  ReportTemplate,
} from "@/lib/api/types";

export async function fetchPortfolioAnalytics(): Promise<PortfolioAnalytics> {
  const data = await apiDataRequest<{ analytics: PortfolioAnalytics }>("/reports/analytics/", {
    method: "GET",
  });
  return data.analytics;
}

export async function fetchReportTemplates(): Promise<ReportTemplate[]> {
  const data = await apiDataRequest<{ templates: ReportTemplate[] }>("/reports/templates/", {
    method: "GET",
  });
  return data.templates;
}

export async function fetchProjectAnalytics(
  projectId: string,
  params?: { report_type?: string; date_from?: string; date_to?: string },
): Promise<ProjectAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params?.report_type) query.set("report_type", params.report_type);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const qs = query.toString();
  return apiDataRequest<ProjectAnalyticsResponse>(
    `/projects/${projectId}/analytics/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

export async function fetchGeneratedReports(params?: {
  page?: number;
  page_size?: number;
  report_type?: string;
}): Promise<PaginatedResponse<GeneratedReport>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.report_type) query.set("report_type", params.report_type);
  const qs = query.toString();
  return apiRequest<PaginatedResponse<GeneratedReport>>(
    `/reports/generated/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

export async function fetchGeneratedReport(id: string): Promise<GeneratedReport> {
  const data = await apiDataRequest<{ report: GeneratedReport }>(`/reports/generated/${id}/`, {
    method: "GET",
  });
  return data.report;
}

export async function generateReport(input: ReportGenerateInput): Promise<GeneratedReport> {
  const data = await apiDataRequest<{ report: GeneratedReport }>("/reports/generated/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.report;
}
