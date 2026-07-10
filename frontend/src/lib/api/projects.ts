import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse, ProjectListItem } from "@/lib/api/types";

export async function fetchProjects(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}): Promise<PaginatedResponse<ProjectListItem>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiRequest<PaginatedResponse<ProjectListItem>>(
    `/projects/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}
