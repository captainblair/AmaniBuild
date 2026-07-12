import type { ScheduleItemStatus } from "@/lib/api/types";

export const SCHEDULE_STATUSES: { value: ScheduleItemStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
  { value: "on_hold", label: "On hold" },
];

export function scheduleStatusLabel(status: string): string {
  return SCHEDULE_STATUSES.find((s) => s.value === status)?.label ?? status.replaceAll("_", " ");
}

export function scheduleStatusTone(
  status: string,
): "good" | "active" | "risk" | "muted" | "hold" {
  if (status === "completed") return "good";
  if (status === "in_progress") return "active";
  if (status === "delayed") return "risk";
  if (status === "on_hold") return "hold";
  return "muted";
}

export function formatScheduleDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
}

export function buildMonthHeaders(rangeStart: Date, rangeEnd: Date): { key: string; label: string; days: number }[] {
  const months: { key: string; label: string; days: number }[] = [];
  let cursor = startOfMonth(rangeStart);
  const last = endOfMonth(rangeEnd);
  while (cursor <= last) {
    const monthEnd = endOfMonth(cursor);
    const visibleStart = cursor < rangeStart ? rangeStart : cursor;
    const visibleEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
    const days = Math.max(daysBetween(visibleStart, visibleEnd) + 1, 1);
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleDateString("en-KE", { month: "short", year: "numeric" }),
      days,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
  }
  return months;
}

export function barGeometry(
  itemStart: string,
  itemEnd: string,
  rangeStart: Date,
  totalDays: number,
): { left: number; width: number } {
  const start = parseIsoDate(itemStart);
  const end = parseIsoDate(itemEnd);
  const offset = Math.max(daysBetween(rangeStart, start), 0);
  const duration = Math.max(daysBetween(start, end) + 1, 1);
  const left = (offset / totalDays) * 100;
  const width = Math.max((duration / totalDays) * 100, 0.8);
  return { left, width: Math.min(width, 100 - left) };
}
