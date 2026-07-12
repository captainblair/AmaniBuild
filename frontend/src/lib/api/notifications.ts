import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  ActivityTimelineItem,
  AppNotification,
  NotificationSummary,
  PaginatedResponse,
} from "@/lib/api/types";

export type NotificationListResponse = PaginatedResponse<AppNotification> & {
  summary: NotificationSummary;
};

export type NotificationListParams = {
  page?: number;
  page_size?: number;
  category?: string;
  is_read?: boolean;
  project_id?: string;
  search?: string;
};

function buildQuery(params?: NotificationListParams): string {
  const query = new URLSearchParams();
  if (!params) return "";
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.category) query.set("category", params.category);
  if (params.is_read !== undefined) query.set("is_read", String(params.is_read));
  if (params.project_id) query.set("project_id", params.project_id);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchNotifications(
  params?: NotificationListParams,
): Promise<NotificationListResponse> {
  return apiRequest<NotificationListResponse>(`/notifications/${buildQuery(params)}`, {
    method: "GET",
  });
}

export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const data = await apiDataRequest<{ summary: NotificationSummary }>("/notifications/summary/", {
    method: "GET",
  });
  return data.summary;
}

export async function fetchNotification(id: string): Promise<AppNotification> {
  const data = await apiDataRequest<{ notification: AppNotification }>(`/notifications/${id}/`, {
    method: "GET",
  });
  return data.notification;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const data = await apiDataRequest<{ notification: AppNotification }>(
    `/notifications/${id}/read/`,
    { method: "POST" },
  );
  return data.notification;
}

export async function markAllNotificationsRead(): Promise<{
  updated_count: number;
  summary: NotificationSummary;
}> {
  return apiDataRequest<{ updated_count: number; summary: NotificationSummary }>(
    "/notifications/read-all/",
    { method: "POST" },
  );
}

export async function fetchActivityTimeline(params?: {
  project_id?: string;
  limit?: number;
}): Promise<ActivityTimelineItem[]> {
  const query = new URLSearchParams();
  if (params?.project_id) query.set("project_id", params.project_id);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const data = await apiDataRequest<{ timeline: ActivityTimelineItem[] }>(
    `/activity/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.timeline;
}
