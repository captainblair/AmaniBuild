import { taskPriorityLabel, taskStatusLabel } from "@/lib/tasks/labels";

export function TaskStatusBadge({ status }: { status: string }) {
  const tone =
    status === "done"
      ? "task-badge task-badge--good"
      : status === "in_progress"
        ? "task-badge task-badge--warn"
        : "task-badge task-badge--muted";
  return <span className={tone}>{taskStatusLabel(status)}</span>;
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "high"
      ? "task-badge task-badge--danger"
      : priority === "low"
        ? "task-badge task-badge--muted"
        : "task-badge task-badge--warn";
  return <span className={tone}>{taskPriorityLabel(priority)}</span>;
}
