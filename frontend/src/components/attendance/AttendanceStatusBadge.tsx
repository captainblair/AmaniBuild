import { statusLabel } from "@/lib/attendance/labels";

const toneClass: Record<string, string> = {
  present: "att-badge att-badge--good",
  late: "att-badge att-badge--warn",
  absent: "att-badge att-badge--danger",
  not_checked_in: "att-badge att-badge--muted",
};

export function AttendanceStatusBadge({ status }: { status: string }) {
  return <span className={toneClass[status] ?? "att-badge att-badge--muted"}>{statusLabel(status)}</span>;
}
