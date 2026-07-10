export function formatKes(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

export function parseMoney(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Compact KES for KPI cards (e.g. KSh 45.2M). */
export function formatKesCompact(amount: string | number): string {
  const n = parseMoney(amount);
  if (Math.abs(n) >= 1_000_000) {
    return `KSh ${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `KSh ${(n / 1_000).toFixed(1)}K`;
  }
  return formatKes(n);
}

export function budgetUtilization(spent: string | number, total: string | number): number {
  const t = parseMoney(total);
  if (!t) return 0;
  return Math.round((parseMoney(spent) / t) * 1000) / 10;
}

export function projectHealth(status: string, progress: number, utilization: number): {
  label: string;
  tone: "good" | "risk" | "delayed";
} {
  if (status === "on_hold" || status === "cancelled") {
    return { label: status === "on_hold" ? "On Hold" : "Cancelled", tone: "delayed" };
  }
  if (status === "completed") return { label: "Complete", tone: "good" };
  if (utilization > 95 && progress < 80) return { label: "At Risk", tone: "risk" };
  if (progress < 25 && utilization > 40) return { label: "At Risk", tone: "risk" };
  return { label: "On Track", tone: "good" };
}
