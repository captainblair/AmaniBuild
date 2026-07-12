import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  Inspection,
  InspectionChecklistTemplate,
  InspectionDashboard,
  InspectionListItem,
  InspectionReviewInput,
  InspectionWriteInput,
  PaginatedResponse,
} from "@/lib/api/types";

export type InspectionListParams = {
  page?: number;
  page_size?: number;
  status?: string;
  inspection_type?: string;
  project_id?: string;
  search?: string;
};

function buildQuery(params?: InspectionListParams): string {
  const query = new URLSearchParams();
  if (!params) return "";
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.status) query.set("status", params.status);
  if (params.inspection_type) query.set("inspection_type", params.inspection_type);
  if (params.project_id) query.set("project_id", params.project_id);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchInspectionTemplates(): Promise<InspectionChecklistTemplate[]> {
  const data = await apiDataRequest<{ templates: InspectionChecklistTemplate[] }>(
    "/inspections/templates/",
    { method: "GET" },
  );
  return data.templates;
}

export async function fetchInspectionDashboard(params?: {
  project_id?: string;
}): Promise<InspectionDashboard> {
  const query = new URLSearchParams();
  if (params?.project_id) query.set("project_id", params.project_id);
  const qs = query.toString();
  const data = await apiDataRequest<{ dashboard: InspectionDashboard }>(
    `/inspections/dashboard/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.dashboard;
}

export async function fetchInspections(
  params?: InspectionListParams,
): Promise<PaginatedResponse<InspectionListItem>> {
  return apiRequest<PaginatedResponse<InspectionListItem>>(
    `/inspections/${buildQuery(params)}`,
    { method: "GET" },
  );
}

export async function fetchInspection(id: string): Promise<Inspection> {
  const data = await apiDataRequest<{ inspection: Inspection }>(`/inspections/${id}/`, {
    method: "GET",
  });
  return data.inspection;
}

export async function createInspection(
  input: InspectionWriteInput & { project_id: string },
): Promise<Inspection> {
  const data = await apiDataRequest<{ inspection: Inspection }>("/inspections/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.inspection;
}

export async function updateInspection(
  id: string,
  input: Partial<InspectionWriteInput>,
): Promise<Inspection> {
  const data = await apiDataRequest<{ inspection: Inspection }>(`/inspections/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.inspection;
}

export async function deleteInspection(id: string): Promise<void> {
  await apiDataRequest<{ deleted: boolean }>(`/inspections/${id}/`, { method: "DELETE" });
}

export async function startInspection(id: string): Promise<Inspection> {
  const data = await apiDataRequest<{ inspection: Inspection }>(`/inspections/${id}/start/`, {
    method: "POST",
  });
  return data.inspection;
}

export async function submitInspection(id: string): Promise<Inspection> {
  const data = await apiDataRequest<{ inspection: Inspection }>(`/inspections/${id}/submit/`, {
    method: "POST",
  });
  return data.inspection;
}

export async function reviewInspection(
  id: string,
  input: InspectionReviewInput,
): Promise<Inspection> {
  const data = await apiDataRequest<{ inspection: Inspection }>(`/inspections/${id}/review/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.inspection;
}
