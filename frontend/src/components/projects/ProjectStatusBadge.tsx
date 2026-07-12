import { projectHealth } from "@/lib/format";
import { statusLabel } from "@/lib/projects/labels";

const statusTone: Record<string, string> = {
  planning: "proj-badge--muted",
  active: "proj-badge--good",
  on_hold: "proj-badge--warn",
  completed: "proj-badge--good",
  cancelled: "proj-badge--danger",
};

type Props = {
  status: string;
  progress?: number;
  utilization?: number;
  showHealth?: boolean;
};

export function ProjectStatusBadge({
  status,
  progress = 0,
  utilization = 0,
  showHealth = false,
}: Props) {
  if (showHealth) {
    const health = projectHealth(status, progress, utilization);
    const healthClass =
      health.tone === "good"
        ? "proj-badge--good"
        : health.tone === "risk"
          ? "proj-badge--warn"
          : "proj-badge--danger";
    return <span className={`proj-badge ${healthClass}`}>{health.label}</span>;
  }

  return (
    <span className={`proj-badge ${statusTone[status] ?? "proj-badge--muted"}`}>
      {statusLabel(status)}
    </span>
  );
}
