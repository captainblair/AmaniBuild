import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  InventoryDashboard,
  InventoryItem,
  InventoryItemListItem,
  InventoryItemWriteInput,
  InventoryStatusCounts,
  PaginatedResponse,
  StockMovement,
} from "@/lib/api/types";

export type InventoryItemListResponse = PaginatedResponse<InventoryItemListItem> & {
  status_counts: InventoryStatusCounts;
};

export async function fetchInventoryDashboard(params?: {
  site_id?: string;
  project_id?: string;
}): Promise<InventoryDashboard> {
  const query = new URLSearchParams();
  if (params?.site_id) query.set("site_id", params.site_id);
  if (params?.project_id) query.set("project_id", params.project_id);
  const qs = query.toString();
  const data = await apiDataRequest<{ dashboard: InventoryDashboard }>(
    `/inventory/dashboard/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.dashboard;
}

export async function fetchInventoryItems(params?: {
  page?: number;
  page_size?: number;
  site_id?: string;
  project_id?: string;
  category?: string;
  status?: string;
  search?: string;
}): Promise<InventoryItemListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.site_id) query.set("site_id", params.site_id);
  if (params?.project_id) query.set("project_id", params.project_id);
  if (params?.category) query.set("category", params.category);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return apiRequest<InventoryItemListResponse>(`/inventory/items/${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
}

export async function fetchInventoryItem(id: string): Promise<InventoryItem> {
  const data = await apiDataRequest<{ item: InventoryItem }>(`/inventory/items/${id}/`, {
    method: "GET",
  });
  return data.item;
}

export async function createInventoryItem(input: InventoryItemWriteInput): Promise<InventoryItem> {
  const data = await apiDataRequest<{ item: InventoryItem }>("/inventory/items/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function updateInventoryItem(
  id: string,
  input: Partial<InventoryItemWriteInput> & { site_id?: string; name?: string },
): Promise<InventoryItem> {
  const data = await apiDataRequest<{ item: InventoryItem }>(`/inventory/items/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function archiveInventoryItem(id: string): Promise<void> {
  await apiDataRequest(`/inventory/items/${id}/`, { method: "DELETE" });
}

export async function stockInItem(
  id: string,
  input: {
    quantity: number | string;
    unit_cost?: number | string | null;
    notes?: string;
    purchase_request_id?: string | null;
  },
): Promise<{ movement: StockMovement; item: InventoryItem }> {
  return apiDataRequest(`/inventory/items/${id}/stock-in/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function stockOutItem(
  id: string,
  input: {
    quantity: number | string;
    movement_type?: "stock_out" | "wastage";
    notes?: string;
  },
): Promise<{ movement: StockMovement; item: InventoryItem }> {
  return apiDataRequest(`/inventory/items/${id}/stock-out/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchItemMovements(id: string): Promise<StockMovement[]> {
  const data = await apiDataRequest<{ movements: StockMovement[] }>(
    `/inventory/items/${id}/movements/`,
    { method: "GET" },
  );
  return data.movements;
}
