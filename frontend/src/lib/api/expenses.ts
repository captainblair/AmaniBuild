import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  Expense,
  ExpenseDashboard,
  ExpenseListItem,
  ExpenseWriteInput,
  PaginatedResponse,
} from "@/lib/api/types";

export type ExpenseListParams = {
  page?: number;
  page_size?: number;
  status?: string;
  category?: string;
  project_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
};

function buildQuery(params?: ExpenseListParams): string {
  const query = new URLSearchParams();
  if (!params) return "";
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  if (params.project_id) query.set("project_id", params.project_id);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchExpenseDashboard(params?: {
  project_id?: string;
}): Promise<ExpenseDashboard> {
  const query = new URLSearchParams();
  if (params?.project_id) query.set("project_id", params.project_id);
  const qs = query.toString();
  const data = await apiDataRequest<{ dashboard: ExpenseDashboard }>(
    `/expenses/dashboard/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.dashboard;
}

export async function fetchExpenses(
  params?: ExpenseListParams,
): Promise<PaginatedResponse<ExpenseListItem>> {
  return apiRequest<PaginatedResponse<ExpenseListItem>>(`/expenses/${buildQuery(params)}`, {
    method: "GET",
  });
}

export async function fetchExpense(id: string): Promise<Expense> {
  const data = await apiDataRequest<{ expense: Expense }>(`/expenses/${id}/`, { method: "GET" });
  return data.expense;
}

export async function createExpense(
  input: ExpenseWriteInput & { project_id: string },
): Promise<Expense> {
  const data = await apiDataRequest<{ expense: Expense }>("/expenses/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.expense;
}

export async function updateExpense(
  id: string,
  input: Partial<ExpenseWriteInput>,
): Promise<Expense> {
  const data = await apiDataRequest<{ expense: Expense }>(`/expenses/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiDataRequest<{ deleted: boolean }>(`/expenses/${id}/`, { method: "DELETE" });
}

export async function submitExpense(id: string): Promise<Expense> {
  const data = await apiDataRequest<{ expense: Expense }>(`/expenses/${id}/submit/`, {
    method: "POST",
  });
  return data.expense;
}

export async function approveExpense(id: string): Promise<Expense> {
  const data = await apiDataRequest<{ expense: Expense }>(`/expenses/${id}/approve/`, {
    method: "POST",
  });
  return data.expense;
}

export async function rejectExpense(id: string, reason = ""): Promise<Expense> {
  const data = await apiDataRequest<{ expense: Expense }>(`/expenses/${id}/reject/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data.expense;
}

export async function reimburseExpense(id: string): Promise<Expense> {
  const data = await apiDataRequest<{ expense: Expense }>(`/expenses/${id}/reimburse/`, {
    method: "POST",
  });
  return data.expense;
}
