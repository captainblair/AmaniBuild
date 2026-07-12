import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  LibraryFolder,
  LibraryItem,
  LibraryItemListItem,
  LibraryItemVersion,
  LibraryItemWriteInput,
  LibraryPhotoTimelineGroup,
  LibrarySummary,
  LibraryUploadResult,
  LibraryVersionWriteInput,
  PaginatedResponse,
} from "@/lib/api/types";

export type LibraryListResponse = PaginatedResponse<LibraryItemListItem> & {
  summary: LibrarySummary;
};

export type LibraryListParams = {
  page?: number;
  page_size?: number;
  project_id?: string;
  asset_type?: string;
  document_type?: string;
  folder?: string;
  search?: string;
  include_archived?: boolean;
};

function buildQuery(params?: LibraryListParams): string {
  const query = new URLSearchParams();
  if (!params) return "";
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.project_id) query.set("project_id", params.project_id);
  if (params.asset_type) query.set("asset_type", params.asset_type);
  if (params.document_type) query.set("document_type", params.document_type);
  if (params.folder) query.set("folder", params.folder);
  if (params.search) query.set("search", params.search);
  if (params.include_archived) query.set("include_archived", "true");
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchLibraryItems(params?: LibraryListParams): Promise<LibraryListResponse> {
  return apiRequest<LibraryListResponse>(`/documents/${buildQuery(params)}`, { method: "GET" });
}

export async function fetchLibraryFolders(params?: LibraryListParams): Promise<LibraryFolder[]> {
  const data = await apiDataRequest<{ folders: LibraryFolder[] }>(
    `/documents/folders/${buildQuery(params)}`,
    { method: "GET" },
  );
  return data.folders;
}

export async function fetchPhotoTimeline(
  params?: LibraryListParams,
): Promise<LibraryPhotoTimelineGroup[]> {
  const data = await apiDataRequest<{ timeline: LibraryPhotoTimelineGroup[] }>(
    `/documents/photos/${buildQuery(params)}`,
    { method: "GET" },
  );
  return data.timeline;
}

export async function fetchLibraryItem(id: string): Promise<LibraryItem> {
  const data = await apiDataRequest<{ item: LibraryItem }>(`/documents/${id}/`, { method: "GET" });
  return data.item;
}

export async function createLibraryItem(input: LibraryItemWriteInput): Promise<LibraryItem> {
  const data = await apiDataRequest<{ item: LibraryItem }>("/documents/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function updateLibraryItem(
  id: string,
  input: Partial<LibraryItemWriteInput>,
): Promise<LibraryItem> {
  const data = await apiDataRequest<{ item: LibraryItem }>(`/documents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function deleteLibraryItem(id: string): Promise<void> {
  await apiDataRequest<{ message: string }>(`/documents/${id}/`, { method: "DELETE" });
}

export async function fetchLibraryVersions(id: string): Promise<LibraryItemVersion[]> {
  const data = await apiDataRequest<{ versions: LibraryItemVersion[] }>(
    `/documents/${id}/versions/`,
    { method: "GET" },
  );
  return data.versions;
}

export async function createLibraryVersion(
  id: string,
  input: LibraryVersionWriteInput,
): Promise<LibraryItem> {
  const data = await apiDataRequest<{ item: LibraryItem }>(`/documents/${id}/versions/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function uploadLibraryFile(file: File): Promise<LibraryUploadResult> {
  const form = new FormData();
  form.append("file", file);
  return apiDataRequest<LibraryUploadResult>("/documents/upload/", {
    method: "POST",
    body: form,
  });
}
