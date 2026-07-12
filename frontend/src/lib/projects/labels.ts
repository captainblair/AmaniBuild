export const PROJECT_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const PROJECT_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "renovation", label: "Renovation" },
] as const;

export function statusLabel(status: string): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status.replaceAll("_", " ");
}

export function typeLabel(type: string): string {
  return PROJECT_TYPES.find((t) => t.value === type)?.label ?? type.replaceAll("_", " ");
}

export function formatProjectDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
