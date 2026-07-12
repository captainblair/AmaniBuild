"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AssignWorkerModal } from "@/components/attendance/AssignWorkerModal";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { CheckInPointsPanel } from "@/components/attendance/CheckInPointsPanel";
import { MarkAttendanceModal } from "@/components/attendance/MarkAttendanceModal";
import { WorkerClockPanel } from "@/components/attendance/WorkerClockPanel";
import { WorkerHistoryModal } from "@/components/attendance/WorkerHistoryModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchAttendanceAnalytics,
  fetchAttendanceDashboard,
  fetchWorkerAssignments,
} from "@/lib/api/attendance";
import { fetchProject, fetchProjects } from "@/lib/api/projects";
import type {
  AttendanceAnalytics,
  AttendanceDashboard,
  AttendanceWorkerCard,
  ProjectListItem,
  WorkerAssignment,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import {
  daysAgoIso,
  formatAttendanceTime,
  todayIso,
  tradeLabel,
} from "@/lib/attendance/labels";

const emptyDashboard: AttendanceDashboard = {
  work_date: todayIso(),
  total_assigned: 0,
  present_today: 0,
  absent_today: 0,
  late_arrivals: 0,
  not_checked_in: 0,
  on_site_now: 0,
  attendance_rate_percent: 0,
  overtime_hours_today: 0,
  workers: [],
};

export function AttendancePage() {
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canView = membership.permissions.includes("view_attendance");
  const canManage = membership.permissions.includes("manage_attendance");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [workDate, setWorkDate] = useState(todayIso());
  const [dashboard, setDashboard] = useState<AttendanceDashboard>(emptyDashboard);
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [markOpen, setMarkOpen] = useState(false);
  const [markWorkerId, setMarkWorkerId] = useState<string | undefined>();
  const [assignOpen, setAssignOpen] = useState(false);
  const [historyWorker, setHistoryWorker] = useState<AttendanceWorkerCard | null>(null);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        const fromQuery = searchParams.get("project");
        const initial =
          (fromQuery && data.results.some((p) => p.id === fromQuery) && fromQuery) ||
          data.results[0]?.id ||
          "";
        setProjectId(initial);
      })
      .catch(() => setProjects([]));
  }, [searchParams]);

  useEffect(() => {
    if (!projectId) {
      setSiteId(null);
      return;
    }
    void fetchProject(projectId)
      .then((p) => setSiteId(p.site?.id ?? null))
      .catch(() => setSiteId(null));
  }, [projectId]);

  const load = useCallback(async () => {
    if (!projectId) {
      setDashboard(emptyDashboard);
      setAnalytics(null);
      setAssignments([]);
      setLoading(false);
      return;
    }

    if (!canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [dash, an, assigns] = await Promise.all([
        fetchAttendanceDashboard(projectId, workDate),
        fetchAttendanceAnalytics(projectId, {
          date_from: daysAgoIso(6),
          date_to: workDate,
        }),
        fetchWorkerAssignments(projectId),
      ]);
      setDashboard(dash);
      setAnalytics(an);
      setAssignments(assigns);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load attendance.");
    } finally {
      setLoading(false);
    }
  }, [projectId, workDate, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dashboard.workers.filter((w) => {
      if (statusFilter && w.status !== statusFilter) return false;
      if (!q) return true;
      return (
        w.full_name.toLowerCase().includes(q) ||
        w.trade.toLowerCase().includes(q) ||
        (w.employee_code || "").toLowerCase().includes(q)
      );
    });
  }, [dashboard.workers, search, statusFilter]);

  const maxTrend = useMemo(() => {
    if (!analytics?.daily_trend.length) return 100;
    return Math.max(100, ...analytics.daily_trend.map((d) => d.attendance_rate_percent));
  }, [analytics]);

  if (projects.length === 0 && !loading) {
    return (
      <div className="dash-empty">
        <p className="dash-empty__title">No projects yet</p>
        <p className="dash-empty__text">Create a project first, then track site attendance.</p>
        <Link href="/dashboard/projects?new=1" className="dash-empty__link">
          Go to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="att-page space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--gray-500)]">Attendance</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            Site attendance
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            Live check-ins, roster status, and gate codes for{" "}
            {selectedProject?.name ?? "your projects"}.
          </p>
        </div>
        {canManage && projectId ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setAssignOpen(true)}>
              + Assign worker
            </Button>
            <Button
              type="button"
              onClick={() => {
                setMarkWorkerId(undefined);
                setMarkOpen(true);
              }}
              disabled={dashboard.workers.length === 0}
            >
              + Mark attendance
            </Button>
          </div>
        ) : null}
      </div>

      <div className="att-toolbar dash-panel">
        <select
          className="att-select"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {canView ? (
          <input
            type="date"
            className="att-select"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
        ) : null}
      </div>

      {projectId ? <WorkerClockPanel projectId={projectId} projectName={selectedProject?.name} /> : null}

      {canView ? (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner label="Loading attendance…" />
            </div>
          ) : null}
          {error ? <p className="att-form-error">{error}</p> : null}

          {!loading ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total assigned" value={dashboard.total_assigned} />
                <KpiCard label="Present today" value={dashboard.present_today} tone="success" />
                <KpiCard
                  label="Absent"
                  value={dashboard.absent_today}
                  tone={dashboard.absent_today ? "danger" : "default"}
                />
                <KpiCard
                  label="Late arrivals"
                  value={dashboard.late_arrivals}
                  tone={dashboard.late_arrivals ? "warn" : "default"}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="On site now" value={dashboard.on_site_now} />
                <KpiCard
                  label="Attendance rate"
                  value={`${dashboard.attendance_rate_percent}%`}
                  tone="success"
                />
                <KpiCard
                  label="Overtime today"
                  value={`${dashboard.overtime_hours_today}h`}
                  hint={`${dashboard.not_checked_in} not checked in`}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
                <section className="dash-panel overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dash-line)] px-4 py-3.5">
                    <h2 className="dash-panel__title">Worker attendance</h2>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="att-select att-select--sm"
                        placeholder="Search workers…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <select
                        className="att-select att-select--sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All statuses</option>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="not_checked_in">Not checked in</option>
                      </select>
                    </div>
                  </div>

                  {filteredWorkers.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-[var(--gray-500)]">
                        {dashboard.workers.length === 0
                          ? "No workers assigned yet."
                          : "No workers match your filters."}
                      </p>
                      {canManage && dashboard.workers.length === 0 ? (
                        <Button type="button" className="mt-4" onClick={() => setAssignOpen(true)}>
                          Assign first worker
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="att-worker-grid p-4">
                      {filteredWorkers.map((worker) => (
                        <article key={worker.worker_id} className="att-worker-card">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--navy)]">{worker.full_name}</p>
                              <p className="text-xs text-[var(--gray-500)]">
                                {tradeLabel(worker.trade)}
                                {worker.employee_code ? ` · ${worker.employee_code}` : ""}
                              </p>
                            </div>
                            <AttendanceStatusBadge status={worker.status} />
                          </div>
                          <p className="mt-3 text-sm text-[var(--gray-600)]">
                            Check-in {formatAttendanceTime(worker.check_in_at)}
                            {worker.check_in_location ? ` · ${worker.check_in_location}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-[var(--gray-500)]">
                            {worker.on_site_now ? "On site now" : "Off site"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="att-link-btn"
                              onClick={() => setHistoryWorker(worker)}
                            >
                              History
                            </button>
                            {canManage ? (
                              <button
                                type="button"
                                className="att-link-btn"
                                onClick={() => {
                                  setMarkWorkerId(worker.worker_id);
                                  setMarkOpen(true);
                                }}
                              >
                                Mark
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <aside className="space-y-4">
                  <CheckInPointsPanel siteId={siteId} canManage={canManage} />

                  {analytics ? (
                    <section className="dash-panel p-4 space-y-4">
                      <h2 className="dash-panel__title">7-day trend</h2>
                      <div className="att-trend">
                        {analytics.daily_trend.map((day) => (
                          <div key={day.date} className="att-trend__col" title={`${day.attendance_rate_percent}%`}>
                            <div className="att-trend__bar-wrap">
                              <div
                                className="att-trend__bar"
                                style={{
                                  height: `${Math.max(6, (day.attendance_rate_percent / maxTrend) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="att-trend__label">
                              {new Date(day.date + "T12:00:00").toLocaleDateString("en-KE", {
                                weekday: "narrow",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                      {analytics.trade_breakdown.length ? (
                        <div>
                          <p className="text-xs font-medium text-[var(--gray-500)]">By trade</p>
                          <ul className="mt-2 space-y-1.5">
                            {analytics.trade_breakdown.map((t) => (
                              <li
                                key={t.trade}
                                className="flex items-center justify-between text-sm text-[var(--gray-600)]"
                              >
                                <span>{tradeLabel(t.trade)}</span>
                                <span className="font-medium text-[var(--navy)]">{t.count}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </aside>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--gray-500)]">
          Use My clock above to check in and out for your assigned project.
        </p>
      )}

      {markOpen && projectId ? (
        <MarkAttendanceModal
          projectId={projectId}
          workDate={workDate}
          workers={dashboard.workers}
          initialWorkerId={markWorkerId}
          onClose={() => setMarkOpen(false)}
          onSaved={() => void load()}
        />
      ) : null}

      {assignOpen && projectId ? (
        <AssignWorkerModal
          projectId={projectId}
          assignments={assignments}
          onClose={() => setAssignOpen(false)}
          onSaved={() => void load()}
        />
      ) : null}

      {historyWorker && projectId ? (
        <WorkerHistoryModal
          projectId={projectId}
          workerId={historyWorker.worker_id}
          workerName={historyWorker.full_name}
          onClose={() => setHistoryWorker(null)}
        />
      ) : null}
    </div>
  );
}
