"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchActivityTimeline,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { fetchProjects } from "@/lib/api/projects";
import type {
  ActivityTimelineItem,
  AppNotification,
  NotificationSummary,
  ProjectListItem,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import {
  categoryLabel,
  eventTypeLabel,
  formatActivityTime,
  formatRelativeTime,
  initialsFromName,
  NOTIFICATION_CATEGORIES,
  resolveNotificationHref,
} from "@/lib/notifications/labels";

const emptySummary: NotificationSummary = {
  unread_total: 0,
  critical: 0,
  approval: 0,
  inventory: 0,
  mention: 0,
  general: 0,
};

type ReadFilter = "all" | "unread" | "urgent";
type MobilePane = "list" | "feed" | "timeline";

function categoryTone(category: string): "critical" | "approval" | "inventory" | "mention" | "general" {
  if (category === "critical" || category === "approval" || category === "inventory" || category === "mention") {
    return category;
  }
  return "general";
}

export function NotificationsPage() {
  const { membership } = useDashboardSession();
  const canView = membership.permissions.includes("view_notifications");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>(emptySummary);
  const [timeline, setTimeline] = useState<ActivityTimelineItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => setProjects(data.results))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view notifications.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const listParams = {
        page_size: 100,
        project_id: projectId || undefined,
        search: search.trim() || undefined,
        category: category !== "all" ? category : undefined,
        is_read: readFilter === "unread" ? false : undefined,
      };
      const [list, activity] = await Promise.all([
        fetchNotifications(listParams),
        fetchActivityTimeline({ project_id: projectId || undefined, limit: 40 }),
      ]);
      let nextItems = list.results;
      if (readFilter === "urgent") {
        nextItems = nextItems.filter(
          (n) => n.priority === "high" || n.category === "critical" || n.category === "approval",
        );
      }
      setItems(nextItems);
      setSummary(list.summary ?? emptySummary);
      setTimeline(activity);
      setSelectedId((prev) => {
        if (prev && nextItems.some((n) => n.id === prev)) return prev;
        return nextItems[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [canView, projectId, search, category, readFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => items.find((n) => n.id === selectedId) ?? null,
    [items, selectedId],
  );

  const grouped = useMemo(() => {
    const buckets: Record<string, AppNotification[]> = {
      critical: [],
      approval: [],
      inventory: [],
      mention: [],
      general: [],
    };
    for (const item of items) {
      const key = categoryTone(item.category);
      buckets[key].push(item);
    }
    return buckets;
  }, [items]);

  async function onMarkRead(id: string) {
    const current = items.find((n) => n.id === id);
    if (!current || current.is_read) return;
    setBusy(true);
    try {
      const updated = await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
      setSummary((prev) => {
        const key = categoryTone(current.category);
        return {
          ...prev,
          unread_total: Math.max(0, prev.unread_total - 1),
          [key]: Math.max(0, (prev[key as keyof NotificationSummary] as number) - 1),
        };
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not mark as read.");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkAllRead() {
    setBusy(true);
    try {
      const result = await markAllNotificationsRead();
      setSummary(result.summary);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not mark all as read.");
    } finally {
      setBusy(false);
    }
  }

  function openItem(id: string) {
    setSelectedId(id);
    setMobilePane("feed");
    const item = items.find((n) => n.id === id);
    if (item && !item.is_read) void onMarkRead(id);
  }

  if (!canView) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">You do not have permission to view notifications.</p>
      </div>
    );
  }

  return (
    <div className="notif-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            Notifications & Activity
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            Approvals, stock alerts, and a live feed of site activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy || summary.unread_total === 0} onClick={() => void onMarkAllRead()}>
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Unread" value={summary.unread_total} tone={summary.unread_total ? "warn" : "default"} />
        <KpiCard label="Critical" value={summary.critical} tone={summary.critical ? "danger" : "default"} />
        <KpiCard label="Approvals" value={summary.approval} tone={summary.approval ? "warn" : "default"} />
        <KpiCard label="Inventory" value={summary.inventory} />
      </div>

      {error ? <p className="notif-error">{error}</p> : null}

      <div className="notif-mobile-tabs lg:hidden">
        {(
          [
            ["list", "Inbox"],
            ["feed", "Details"],
            ["timeline", "Activity"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mobilePane === id ? "is-active" : ""}
            onClick={() => setMobilePane(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="notif-shell">
        <aside className={`notif-inbox ${mobilePane === "list" ? "is-mobile-open" : ""}`}>
          <div className="notif-inbox__head">
            <h2>Notifications ({summary.unread_total})</h2>
          </div>
          <input
            type="search"
            className="notif-search"
            placeholder="Search alerts…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="notif-tabs">
            {(
              [
                ["all", "All"],
                ["unread", "Unread"],
                ["urgent", "Urgent"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={readFilter === id ? "is-active" : ""}
                onClick={() => setReadFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="notif-filters">
            {NOTIFICATION_CATEGORIES.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={category === chip.value ? "is-active" : ""}
                onClick={() => setCategory(chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <select
            className="notif-select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading…" />
            </div>
          ) : items.length === 0 ? (
            <p className="notif-empty">No notifications match these filters.</p>
          ) : (
            <ul className="notif-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`notif-list__item ${selectedId === item.id ? "is-selected" : ""} ${item.is_read ? "" : "is-unread"}`}
                    onClick={() => openItem(item.id)}
                  >
                    <span className={`notif-dot notif-dot--${categoryTone(item.category)}`} />
                    <span className="min-w-0 flex-1">
                      <span className="notif-list__title">{item.title}</span>
                      <span className="notif-list__meta">
                        {categoryLabel(item.category)} · {formatRelativeTime(item.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={`notif-feed ${mobilePane === "feed" ? "is-mobile-open" : ""}`}>
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner label="Loading feed…" />
            </div>
          ) : selected ? (
            <article className={`notif-card notif-card--${categoryTone(selected.category)}`}>
              <div className="notif-card__badge">{categoryLabel(selected.category)}</div>
              <h2>{selected.title}</h2>
              <p className="notif-card__body">{selected.body || "No additional details."}</p>
              <div className="notif-card__meta">
                <span>{selected.project_name || "Company-wide"}</span>
                <span>{formatRelativeTime(selected.created_at)}</span>
                <span>{selected.actor?.full_name || "System"}</span>
              </div>
              <div className="notif-card__actions">
                {selected.action_url ? (
                  <Button href={resolveNotificationHref(selected.action_url)} size="sm">
                    {selected.action_label || "Open"}
                  </Button>
                ) : null}
                {!selected.is_read ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onMarkRead(selected.id)}
                  >
                    Mark read
                  </Button>
                ) : (
                  <span className="notif-card__read">Read</span>
                )}
              </div>
            </article>
          ) : (
            <div className="dash-panel p-8 text-center text-sm text-[var(--gray-500)]">
              Select a notification to review details and actions.
            </div>
          )}

          <div className="notif-groups">
            {(
              [
                ["critical", "Critical"],
                ["approval", "Approval requests"],
                ["inventory", "Inventory alerts"],
                ["mention", "Mentions"],
                ["general", "General"],
              ] as const
            ).map(([key, label]) =>
              grouped[key].length ? (
                <div key={key} className="notif-group">
                  <h3>{label}</h3>
                  <div className="notif-group__cards">
                    {grouped[key].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`notif-mini ${item.is_read ? "" : "is-unread"}`}
                        onClick={() => openItem(item.id)}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.body || item.project_name || "—"}</span>
                        <em>{formatRelativeTime(item.created_at)}</em>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>

        <aside className={`notif-timeline ${mobilePane === "timeline" ? "is-mobile-open" : ""}`}>
          <div className="notif-timeline__head">
            <h2>Activity timeline</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading…" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="notif-empty">No recent activity yet.</p>
          ) : (
            <ol className="notif-timeline__list">
              {timeline.map((event, index) => (
                <li key={`${event.source_type}-${event.source_id}-${index}`}>
                  <div className="notif-timeline__avatar">{initialsFromName(event.actor_name)}</div>
                  <div className="notif-timeline__content">
                    <p className="notif-timeline__type">{eventTypeLabel(event.event_type)}</p>
                    <p className="notif-timeline__title">{event.title}</p>
                    {event.summary ? <p className="notif-timeline__summary">{event.summary}</p> : null}
                    <p className="notif-timeline__meta">
                      {event.actor_name || "System"}
                      {event.project_name ? ` · ${event.project_name}` : ""}
                      {" · "}
                      {formatActivityTime(event.occurred_at)}
                    </p>
                    {event.source_type === "purchase_request" && event.source_id ? (
                      <Link
                        href={`/dashboard/procurement/${event.source_id}`}
                        className="notif-timeline__link"
                      >
                        View request
                      </Link>
                    ) : null}
                    {event.source_type === "task" && event.source_id ? (
                      <Link href={`/dashboard/tasks/${event.source_id}`} className="notif-timeline__link">
                        View task
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
