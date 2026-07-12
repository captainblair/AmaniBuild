export const PURCHASE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending_manager", label: "Pending manager" },
  { value: "pending_owner", label: "Pending owner" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export const PURCHASE_CATEGORIES = [
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
  { value: "services", label: "Services" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
] as const;

export function purchaseStatusLabel(status: string) {
  return PURCHASE_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

export function purchaseCategoryLabel(category: string) {
  return PURCHASE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function purchaseStepLabel(stepType: string) {
  const map: Record<string, string> = {
    submitted: "Submitted",
    manager_review: "Manager review",
    owner_approval: "Owner approval",
  };
  return map[stepType] ?? stepType.replace(/_/g, " ");
}

export function isPendingPurchaseStatus(status: string) {
  return status === "pending_manager" || status === "pending_owner";
}
