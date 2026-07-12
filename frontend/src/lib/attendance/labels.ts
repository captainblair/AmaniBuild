export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "not_checked_in", label: "Not checked in" },
] as const;

export const WORKER_TRADES = [
  { value: "mason", label: "Mason" },
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "steel_fixer", label: "Steel fixer" },
  { value: "carpenter", label: "Carpenter" },
  { value: "engineer", label: "Engineer" },
  { value: "foreman", label: "Foreman" },
  { value: "labourer", label: "Labourer" },
  { value: "other", label: "Other" },
] as const;

export function tradeLabel(trade: string) {
  return WORKER_TRADES.find((t) => t.value === trade)?.label ?? trade.replace(/_/g, " ");
}

export function statusLabel(status: string) {
  return ATTENDANCE_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

export function formatAttendanceTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
