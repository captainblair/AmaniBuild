import type { ExpenseCategory, ExpensePaymentMethod, ExpenseStatus } from "@/lib/api/types";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "materials", label: "Materials" },
  { value: "labour", label: "Labour" },
  { value: "transport", label: "Transport" },
  { value: "fuel", label: "Fuel" },
  { value: "meals", label: "Meals & Subsistence" },
  { value: "equipment", label: "Equipment Hire" },
  { value: "utilities", label: "Utilities" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "other", label: "Other" },
];

export const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export const EXPENSE_STATUSES: { value: ExpenseStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "reimbursed", label: "Reimbursed" },
];

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
}

export function expenseStatusLabel(value: string): string {
  return EXPENSE_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function expenseStatusTone(status: string): "muted" | "warn" | "good" | "danger" | "info" {
  switch (status) {
    case "approved":
    case "reimbursed":
      return "good";
    case "submitted":
      return "warn";
    case "rejected":
      return "danger";
    case "draft":
      return "muted";
    default:
      return "info";
  }
}

export function formatExpenseDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function receiptUrl(photo: { url?: string; file_url?: string }): string {
  return photo.url || photo.file_url || "";
}
