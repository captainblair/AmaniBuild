export const MATERIAL_CATEGORIES = [
  { value: "cement", label: "Cement" },
  { value: "steel", label: "Steel" },
  { value: "aggregates", label: "Aggregates" },
  { value: "timber", label: "Timber" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "tools", label: "Tools" },
  { value: "other", label: "Other" },
] as const;

export const STOCK_STATUSES = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "low_stock", label: "Low stock" },
] as const;

export function materialCategoryLabel(category: string) {
  return MATERIAL_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function stockStatusLabel(status: string) {
  return STOCK_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

export function movementTypeLabel(type: string) {
  const map: Record<string, string> = {
    stock_in: "Stock in",
    stock_out: "Stock out",
    wastage: "Wastage",
    adjustment: "Adjustment",
  };
  return map[type] ?? type.replace(/_/g, " ");
}
