import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  PaginatedResponse,
  Project,
  ProjectListItem,
  ProjectOverview,
  ProjectWriteInput,
} from "@/lib/api/types";

export async function fetchProjects(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
  site_id?: string;
  ordering?: string;
}): Promise<PaginatedResponse<ProjectListItem>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.site_id) query.set("site_id", params.site_id);
  if (params?.ordering) query.set("ordering", params.ordering);
  const qs = query.toString();
  return apiRequest<PaginatedResponse<ProjectListItem>>(
    `/projects/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

export async function fetchProject(id: string): Promise<Project> {
  const data = await apiDataRequest<{ project: Project }>(`/projects/${id}/`, {
    method: "GET",
  });
  return data.project;
}

export async function fetchProjectOverview(id: string): Promise<ProjectOverview> {
  return apiDataRequest<ProjectOverview>(`/projects/${id}/overview/`, {
    method: "GET",
  });
}

export async function createProject(input: ProjectWriteInput): Promise<Project> {
  const data = await apiDataRequest<{ project: Project }>("/projects/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.project;
}

export async function updateProject(id: string, input: Partial<ProjectWriteInput>): Promise<Project> {
  const data = await apiDataRequest<{ project: Project }>(`/projects/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.project;
}

export async function archiveProject(id: string): Promise<void> {
  await apiDataRequest<{ message: string }>(`/projects/${id}/`, {
    method: "DELETE",
  });
}
