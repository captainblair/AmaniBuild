import type { ReportType } from "@/lib/api/types";

export const REPORT_DESCRIPTIONS: Record<string, string> = {
  progress: "Track planned vs actual progress, milestones, and remaining days.",
  cost_variance: "Compare budget spent against approved costs and remaining funds.",
  attendance_payroll: "Export attendance summaries for payroll and labor tracking.",
  material_usage: "Review stock movements, usage, and low-stock alerts by project.",
  diary_summary: "Summarize site diary entries, issues, and approvals for a period.",
  budget_vs_actual: "See budget utilization and approved procurement totals.",
  safety_incidents: "List diary-logged safety concerns and required actions.",
  custom: "Build a custom snapshot of tasks and priorities for a project.",
};

export function reportTypeLabel(value: string, templates?: { report_type: string; label: string }[]): string {
  const fromApi = templates?.find((t) => t.report_type === value)?.label;
  if (fromApi) return fromApi;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function reportDescription(type: ReportType | string): string {
  return REPORT_DESCRIPTIONS[type] ?? "Generate insights for this report type.";
}

export function reportTone(type: string): "blue" | "green" | "purple" | "amber" | "red" | "slate" {
  switch (type) {
    case "progress":
    case "diary_summary":
      return "blue";
    case "cost_variance":
    case "budget_vs_actual":
      return "green";
    case "attendance_payroll":
    case "custom":
      return "purple";
    case "material_usage":
      return "amber";
    case "safety_incidents":
      return "red";
    default:
      return "slate";
  }
}

export function formatReportDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatReportDateTime(value: string | null | undefined): string {
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

export function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asString(value: unknown, fallback = "—"): string {
  if (value == null) return fallback;
  return String(value);
}
