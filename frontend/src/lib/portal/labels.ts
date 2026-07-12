import { projectHealth } from "@/lib/format";

export function formatPortalDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatPortalMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-KE", { month: "short", year: "numeric" });
}

export function portalHealthLabel(
  status: string,
  progress: number,
  utilization: number,
): { label: string; tone: "good" | "risk" | "delayed" } {
  return projectHealth(status, progress, utilization);
}

export function milestoneStageTone(
  completed: boolean,
  status: string,
): "done" | "current" | "upcoming" {
  if (completed || status === "done") return "done";
  if (status === "in_progress" || status === "blocked" || status === "review") return "current";
  return "upcoming";
}

export function milestoneStageLabel(tone: "done" | "current" | "upcoming"): string {
  if (tone === "done") return "Complete";
  if (tone === "current") return "In Progress";
  return "Upcoming";
}
