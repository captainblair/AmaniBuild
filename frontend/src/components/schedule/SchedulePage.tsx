"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { GanttChart } from "@/components/schedule/GanttChart";
import { ScheduleItemFormModal } from "@/components/schedule/ScheduleItemFormModal";
import { SchedulePhaseFormModal } from "@/components/schedule/SchedulePhaseFormModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchProjects } from "@/lib/api/projects";
import {
  deleteScheduleItem,
  fetchScheduleDashboard,
  fetchScheduleGantt,
  syncScheduleItemFromTask,
} from "@/lib/api/schedule";
import { fetchCompanyMembers } from "@/lib/api/team";
import type {
  CompanyMember,
  ProjectListItem,
  ScheduleDashboard,
  ScheduleGantt,
  ScheduleItem,
  SchedulePhase,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import {
  formatScheduleDate,
  scheduleStatusLabel,
  scheduleStatusTone,
} from "@/lib/schedule/labels";

const emptyDash: ScheduleDashboard = {
  total_items: 0,
  completed_items: 0,
  in_progress_items: 0,
  delayed_items: 0,
  overdue_items: 0,
  upcoming_starts_14d: 0,
  project_progress_percent: 0,
};

export function SchedulePage() {
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canView = membership.permissions.includes("view_schedule");
  const canManage = membership.permissions.includes("manage_schedule");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [gantt, setGantt] = useState<ScheduleGantt | null>(null);
  const [dashboard, setDashboard] = useState<ScheduleDashboard>(emptyDash);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [selected, setSelected] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState(false);
  const [phaseModal, setPhaseModal] = useState(false);
  const [milestoneMode, setMilestoneMode] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        const fromQuery = searchParams.get("project");
        if (fromQuery && data.results.some((p) => p.id === fromQuery)) {
          setProjectId(fromQuery);
        } else if (data.results[0]) {
          setProjectId(data.results[0].id);
        }
      })
      .catch(() => setProjects([]));

    void fetchCompanyMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view the schedule.");
      return;
    }
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [g, d] = await Promise.all([
        fetchScheduleGantt(projectId),
        fetchScheduleDashboard(projectId),
      ]);
      setGantt(g);
      setDashboard(d);
      setSelected((cur) => (cur ? g.items.find((i) => i.id === cur.id) ?? null : null));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load schedule.");
      setGantt(null);
    } finally {
      setLoading(false);
    }
  }, [canView, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const phases: SchedulePhase[] = gantt?.phases ?? [];
  const milestones = useMemo(
    () => (gantt?.items ?? []).filter((i) => i.is_milestone).slice(0, 6),
    [gantt],
  );
  const remaining = Math.max(dashboard.total_items - dashboard.completed_items, 0);
  const completedPct =
    dashboard.total_items > 0
      ? Math.round((dashboard.completed_items / dashboard.total_items) * 100)
      : 0;

  async function onDelete(item: ScheduleItem) {
    if (!canManage) return;
    if (!window.confirm(`Delete “${item.title}” from the schedule?`)) return;
    setBusy(true);
    try {
      await deleteScheduleItem(item.id);
      if (selected?.id === item.id) setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not delete item.");
    } finally {
      setBusy(false);
    }
  }

  async function onSync(item: ScheduleItem) {
    if (!canManage || !item.linked_task_id) return;
    setBusy(true);
    try {
      const updated = await syncScheduleItemFromTask(item.id);
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not sync from task.");
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">
          You do not have permission to view project schedules.
        </p>
      </div>
    );
  }

  return (
    <div className="sch-page">
      <header className="sch-header">
        <div className="min-w-0">
          <p className="sch-eyebrow">Scheduling</p>
          <h1 className="sch-title">{project?.name || gantt?.project_name || "Project schedule"}</h1>
          <p className="sch-sub">
            Interactive Gantt timeline — phases, tasks, milestones, and delays.
          </p>
        </div>
        <div className="sch-header__actions">
          <select
            className="sch-select sch-select--toolbar"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setSelected(null);
            }}
            aria-label="Select project"
          >
            {projects.length === 0 ? <option value="">No projects</option> : null}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {canManage && projectId ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPhaseModal(true)}
              >
                + Phase
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setMilestoneMode(false);
                  setItemModal(true);
                }}
              >
                + Task
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setMilestoneMode(true);
                  setItemModal(true);
                }}
              >
                + Milestone
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {error ? <p className="sch-error">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Schedule progress"
          value={`${Math.round(gantt?.summary.overall_progress ?? dashboard.project_progress_percent)}%`}
          hint={`${dashboard.completed_items} of ${dashboard.total_items} done`}
          tone="success"
        />
        <KpiCard
          label="In progress"
          value={dashboard.in_progress_items}
          hint={`${dashboard.upcoming_starts_14d} starting in 14 days`}
        />
        <KpiCard
          label="Delayed / overdue"
          value={dashboard.delayed_items + dashboard.overdue_items}
          hint={`${dashboard.overdue_items} past end date`}
          tone={dashboard.delayed_items + dashboard.overdue_items > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Milestones"
          value={gantt?.summary.milestones ?? 0}
          hint="On this timeline"
        />
      </div>

      {(dashboard.delayed_items > 0 || dashboard.overdue_items > 0) && (
        <div className="sch-alerts">
          {dashboard.overdue_items > 0 ? (
            <p className="sch-alert sch-alert--danger">
              {dashboard.overdue_items} activit
              {dashboard.overdue_items === 1 ? "y is" : "ies are"} past the planned end date.
            </p>
          ) : null}
          {dashboard.delayed_items > 0 ? (
            <p className="sch-alert sch-alert--warn">
              {dashboard.delayed_items} activit
              {dashboard.delayed_items === 1 ? "y marked" : "ies marked"} delayed.
            </p>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading Gantt…" />
        </div>
      ) : !projectId ? (
        <div className="dash-panel p-10 text-center">
          <p className="text-sm text-[var(--gray-500)]">Create a project to start scheduling.</p>
          <Button href="/dashboard/projects" className="mt-4">
            Go to projects
          </Button>
        </div>
      ) : (
        <div className="sch-layout">
          <div className="sch-main">
            {gantt ? (
              <GanttChart
                gantt={gantt}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            ) : null}
          </div>

          <aside className="sch-aside">
            {selected ? (
              <section className="sch-detail">
                <div className="sch-detail__head">
                  <h2 className="sch-detail__title">{selected.title}</h2>
                  <span className={`gantt-pill gantt-pill--${scheduleStatusTone(selected.status)}`}>
                    {scheduleStatusLabel(selected.status)}
                  </span>
                </div>
                <p className="sch-detail__desc">
                  {selected.description?.trim() || "No description."}
                </p>
                <dl className="sch-detail__meta">
                  <div>
                    <dt>Priority window</dt>
                    <dd>
                      {formatScheduleDate(selected.start_date)} –{" "}
                      {formatScheduleDate(selected.end_date)}
                    </dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{selected.duration_days} day{selected.duration_days === 1 ? "" : "s"}</dd>
                  </div>
                  <div>
                    <dt>Phase</dt>
                    <dd>{selected.phase_name || "—"}</dd>
                  </div>
                  <div>
                    <dt>Assignee</dt>
                    <dd>{selected.assignee_name || "Unassigned"}</dd>
                  </div>
                </dl>
                <div className="sch-detail__progress">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <strong>{Math.round(selected.progress_percent)}%</strong>
                  </div>
                  <div className="sch-bar" aria-hidden>
                    <span style={{ width: `${Math.min(100, selected.progress_percent)}%` }} />
                  </div>
                </div>
                {canManage ? (
                  <div className="sch-detail__actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setEditing(selected);
                        setMilestoneMode(selected.is_milestone);
                        setItemModal(true);
                      }}
                    >
                      Edit
                    </Button>
                    {selected.linked_task_id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void onSync(selected)}
                      >
                        Sync task
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void onDelete(selected)}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
                {selected.linked_task_id ? (
                  <p className="sch-detail__link">
                    <Link href={`/dashboard/tasks/${selected.linked_task_id}`}>Open linked task</Link>
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="sch-detail sch-detail--empty">
                <h2 className="sch-detail__title">Activity details</h2>
                <p className="text-sm text-[var(--gray-500)]">
                  Select a bar on the Gantt chart to inspect dates, progress, and assignees.
                </p>
              </section>
            )}

            <section className="sch-detail">
              <h2 className="sch-detail__title">Schedule health</h2>
              <div className="sch-health">
                <div>
                  <strong className="text-[var(--red)]">{dashboard.delayed_items + dashboard.overdue_items}</strong>
                  <span>Delayed / overdue</span>
                </div>
                <div>
                  <strong className="text-[var(--green)]">{dashboard.completed_items}</strong>
                  <span>Completed ({completedPct}%)</span>
                </div>
                <div>
                  <strong>{remaining}</strong>
                  <span>Remaining</span>
                </div>
              </div>
            </section>

            <section className="sch-detail">
              <h2 className="sch-detail__title">Upcoming milestones</h2>
              {milestones.length === 0 ? (
                <p className="text-sm text-[var(--gray-500)]">No milestones on this schedule yet.</p>
              ) : (
                <ul className="sch-milestones">
                  {milestones.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => setSelected(m)}>
                        <span className="sch-milestones__dot" style={{ background: m.color }} />
                        <span className="min-w-0">
                          <strong>{m.title}</strong>
                          <small>{formatScheduleDate(m.end_date)}</small>
                        </span>
                        <span className={`gantt-pill gantt-pill--${scheduleStatusTone(m.status)}`}>
                          {scheduleStatusLabel(m.status)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      {projectId ? (
        <>
          <ScheduleItemFormModal
            open={itemModal}
            onClose={() => {
              setItemModal(false);
              setEditing(null);
            }}
            onSaved={() => void load()}
            projectId={projectId}
            phases={phases}
            members={members}
            initial={editing}
            defaultMilestone={milestoneMode}
          />
          <SchedulePhaseFormModal
            open={phaseModal}
            onClose={() => setPhaseModal(false)}
            onSaved={() => void load()}
            projectId={projectId}
          />
        </>
      ) : null}
    </div>
  );
}
