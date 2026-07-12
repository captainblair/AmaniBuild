import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  PaginatedResponse,
  PurchaseRequest,
  PurchaseRequestActivityItem,
  PurchaseRequestListItem,
  PurchaseRequestStatusCounts,
  PurchaseRequestWriteInput,
} from "@/lib/api/types";

export type PurchaseRequestListResponse = PaginatedResponse<PurchaseRequestListItem> & {
  status_counts: PurchaseRequestStatusCounts;
};

export async function fetchPurchaseRequests(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  project_id?: string;
  category?: string;
  search?: string;
}): Promise<PurchaseRequestListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.status) query.set("status", params.status);
  if (params?.project_id) query.set("project_id", params.project_id);
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return apiRequest<PurchaseRequestListResponse>(
    `/purchase-requests/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

export async function fetchPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const data = await apiDataRequest<{ request: PurchaseRequest }>(`/purchase-requests/${id}/`, {
    method: "GET",
  });
  return data.request;
}

export async function createPurchaseRequest(
  input: PurchaseRequestWriteInput,
): Promise<PurchaseRequest> {
  const data = await apiDataRequest<{ request: PurchaseRequest }>("/purchase-requests/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.request;
}

export async function updatePurchaseRequest(
  id: string,
  input: PurchaseRequestWriteInput,
): Promise<PurchaseRequest> {
  const data = await apiDataRequest<{ request: PurchaseRequest }>(`/purchase-requests/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.request;
}

export async function deletePurchaseRequest(id: string): Promise<void> {
  await apiDataRequest(`/purchase-requests/${id}/`, { method: "DELETE" });
}

export async function submitPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const data = await apiDataRequest<{ request: PurchaseRequest }>(
    `/purchase-requests/${id}/submit/`,
    { method: "POST" },
  );
  return data.request;
}

export async function approvePurchaseRequest(
  id: string,
  notes?: string,
): Promise<PurchaseRequest> {
  const data = await apiDataRequest<{ request: PurchaseRequest }>(
    `/purchase-requests/${id}/approve/`,
    { method: "POST", body: JSON.stringify({ notes: notes ?? "" }) },
  );
  return data.request;
}

export async function rejectPurchaseRequest(id: string, reason: string): Promise<PurchaseRequest> {
  const data = await apiDataRequest<{ request: PurchaseRequest }>(
    `/purchase-requests/${id}/reject/`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
  return data.request;
}

export async function fetchPurchaseRequestActivity(
  id: string,
): Promise<PurchaseRequestActivityItem[]> {
  const data = await apiDataRequest<{ activity: PurchaseRequestActivityItem[] }>(
    `/purchase-requests/${id}/activity/`,
    { method: "GET" },
  );
  return data.activity;
}
