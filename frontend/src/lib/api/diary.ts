import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  DiaryEntry,
  DiaryEntryListItem,
  DiaryEntryWriteInput,
  DiaryInsights,
  DiaryTimelineGroup,
  PaginatedResponse,
} from "@/lib/api/types";

export async function fetchDiaryEntries(
  projectId: string,
  params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  },
): Promise<PaginatedResponse<DiaryEntryListItem>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const qs = query.toString();
  return apiRequest<PaginatedResponse<DiaryEntryListItem>>(
    `/projects/${projectId}/diary-entries/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

export async function fetchDiaryTimeline(
  projectId: string,
  params?: { status?: string; date_from?: string; date_to?: string; search?: string },
): Promise<{ timeline: DiaryTimelineGroup[]; insights: DiaryInsights }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return apiDataRequest(`/projects/${projectId}/diary-entries/timeline/${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
}

export async function fetchDiaryInsights(projectId: string): Promise<DiaryInsights> {
  const data = await apiDataRequest<{ insights: DiaryInsights }>(
    `/projects/${projectId}/diary-insights/`,
    { method: "GET" },
  );
  return data.insights;
}

export async function createDiaryEntry(
  projectId: string,
  input: DiaryEntryWriteInput,
): Promise<DiaryEntry> {
  const data = await apiDataRequest<{ entry: DiaryEntry }>(
    `/projects/${projectId}/diary-entries/`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.entry;
}

export async function fetchDiaryEntry(entryId: string): Promise<DiaryEntry> {
  const data = await apiDataRequest<{ entry: DiaryEntry }>(`/diary-entries/${entryId}/`, {
    method: "GET",
  });
  return data.entry;
}

export async function updateDiaryEntry(
  entryId: string,
  input: Partial<DiaryEntryWriteInput>,
): Promise<DiaryEntry> {
  const data = await apiDataRequest<{ entry: DiaryEntry }>(`/diary-entries/${entryId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.entry;
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  await apiDataRequest<{ message?: string }>(`/diary-entries/${entryId}/`, {
    method: "DELETE",
  });
}

export async function submitDiaryEntry(entryId: string): Promise<DiaryEntry> {
  const data = await apiDataRequest<{ entry: DiaryEntry }>(`/diary-entries/${entryId}/submit/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return data.entry;
}

export async function approveDiaryEntry(entryId: string): Promise<DiaryEntry> {
  const data = await apiDataRequest<{ entry: DiaryEntry }>(`/diary-entries/${entryId}/approve/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return data.entry;
}
