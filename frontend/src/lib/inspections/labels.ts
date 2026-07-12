import type { InspectionResult, InspectionStatus, InspectionType } from "@/lib/api/types";

export const INSPECTION_TYPES: { value: InspectionType; label: string }[] = [
  { value: "general", label: "General QA" },
  { value: "structural", label: "Structural" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "finishing", label: "Finishing" },
  { value: "safety", label: "Safety" },
  { value: "mep", label: "MEP" },
  { value: "other", label: "Other" },
];

export const INSPECTION_STATUSES: { value: InspectionStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
];

export const INSPECTION_RESULTS: { value: InspectionResult; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "conditional_pass", label: "Conditional Pass" },
  { value: "fail", label: "Fail" },
];

export function inspectionTypeLabel(value: string): string {
  return INSPECTION_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function inspectionStatusLabel(value: string): string {
  return INSPECTION_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function inspectionResultLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return INSPECTION_RESULTS.find((r) => r.value === value)?.label ?? value;
}

export function statusTone(status: string): "muted" | "warn" | "good" | "danger" | "info" {
  switch (status) {
    case "passed":
      return "good";
    case "failed":
      return "danger";
    case "submitted":
    case "in_progress":
      return "warn";
    case "scheduled":
      return "info";
    default:
      return "muted";
  }
}

export function formatInspectionDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatInspectionDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
