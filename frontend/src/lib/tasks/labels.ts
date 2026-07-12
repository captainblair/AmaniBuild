export const TASK_STATUSES = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

export const TASK_PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export function taskStatusLabel(status: string) {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

export function taskPriorityLabel(priority: string) {
  return TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
}

export function formatTaskDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length <= 10 ? "T12:00:00" : "")).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}
