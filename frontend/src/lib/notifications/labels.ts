import type { NotificationCategory } from "@/lib/api/types";

export const NOTIFICATION_CATEGORIES: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "approval", label: "Approvals" },
  { value: "inventory", label: "Inventory" },
  { value: "mention", label: "Mentions" },
  { value: "general", label: "General" },
];

export function categoryLabel(value: string): string {
  return NOTIFICATION_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function eventTypeLabel(value: string): string {
  const map: Record<string, string> = {
    attendance: "Attendance",
    diary: "Site Diary",
    procurement: "Procurement",
    inventory: "Inventory",
    task: "Task",
    document: "Document",
    budget: "Budget",
    system: "System",
  };
  return map[value] ?? value;
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function formatActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Map backend action_url paths onto dashboard routes. */
export function resolveNotificationHref(actionUrl: string): string {
  if (!actionUrl) return "";
  if (actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) return actionUrl;
  const messagesMatch = actionUrl.match(/^\/messages\/([^/?#]+)/);
  if (messagesMatch) return `/dashboard/messages?channel=${messagesMatch[1]}`;
  if (actionUrl.startsWith("/dashboard")) return actionUrl;
  if (actionUrl.startsWith("/")) return `/dashboard${actionUrl}`;
  return `/dashboard/${actionUrl}`;
}

export function initialsFromName(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
