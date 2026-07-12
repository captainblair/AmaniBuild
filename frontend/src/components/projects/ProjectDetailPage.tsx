"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientAccessPanel } from "@/components/portal/ClientAccessPanel";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ApiClientError } from "@/lib/api/client";
import { archiveProject, fetchProjectOverview } from "@/lib/api/projects";
import type { Project, ProjectOverview } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import { formatProjectDate, statusLabel, typeLabel } from "@/lib/projects/labels";

const TABS = [
  { id: "overview", label: "Overview", href: "" },
  { id: "diary", label: "Site Diary", href: "diary" },
  { id: "schedule", label: "Schedule", href: "/dashboard/schedule" },
  { id: "tasks", label: "Tasks", href: "/dashboard/tasks" },
  { id: "attendance", label: "Attendance", href: "/dashboard/attendance" },
  { id: "procurement", label: "Procurement", href: "/dashboard/procurement" },
  { id: "inventory", label: "Inventory", href: "/dashboard/inventory" },
  { id: "reports", label: "Reports", href: "/dashboard/reports" },
] as const;

type Props = { projectId: string };

export function ProjectDetailPage({ projectId }: Props) {
  const router = useRouter();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_projects");

  const [data, setData] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchProjectOverview(projectId);
      setData(overview);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onArchive() {
    if (!canManage || !data) return;
    if (!window.confirm(`Archive “${data.project.name}”? You can recreate later if needed.`)) {
      return;
    }
    setArchiving(true);
    try {
      await archiveProject(projectId);
      router.push("/dashboard/projects");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not archive project.");
      setArchiving(false);
    }
  }

  function onSaved(project: Project) {
    setData((current) =>
      current
        ? {
            ...current,
            project,
            summary: {
              ...current.summary,
              status: project.status,
              progress_percent: project.progress_percent,
              budget_total: project.budget_total,
              budget_spent: project.budget_spent,
              budget_remaining: project.budget_remaining,
              budget_utilization_percent: project.budget_utilization_percent,
              has_site: Boolean(project.site),
            },
          }
        : current,
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading project…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dash-panel mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-[var(--red)]">{error ?? "Project not found."}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button href="/dashboard/projects" variant="outline">
            Back to projects
          </Button>
          <Button type="button" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { project, summary } = data;
  const location =
    [project.site?.city, project.site?.county].filter(Boolean).join(", ") ||
    project.site?.name ||
    "Kenya";

  return (
    <div className="proj-detail space-y-5">
      <div className="proj-detail__crumb">
        <Link href="/dashboard/projects">Projects</Link>
        <span>/</span>
        <span>{project.name}</span>
      </div>

      <header className="proj-detail__hero">
        <div className="proj-detail__hero-copy">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <span className="proj-card__type">{typeLabel(project.project_type)}</span>
          </div>
          <h1 className="proj-detail__title">{project.name}</h1>
          <p className="proj-detail__sub">
            {location}
            {project.client_name ? ` · Client: ${project.client_name}` : ""}
            {project.code ? ` · ${project.code}` : ""}
          </p>
          {project.project_manager ? (
            <p className="mt-2 text-sm text-white/75">
              PM: {project.project_manager.full_name}
            </p>
          ) : null}
        </div>

        <div className="proj-detail__hero-actions">
          {canManage ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={archiving}
                onClick={() => void onArchive()}
              >
                {archiving ? "Archiving…" : "Archive"}
              </Button>
            </>
          ) : null}
          <Button href={`/dashboard/diary?project=${project.id}&new=1`} size="sm">
            + Diary entry
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Progress"
          value={`${summary.progress_percent}%`}
          hint={statusLabel(summary.status)}
          tone="success"
        />
        <KpiCard
          label="Budget used"
          value={`${Math.round(summary.budget_utilization_percent)}%`}
          hint={`${formatKesCompact(summary.budget_spent)} of ${formatKesCompact(summary.budget_total)}`}
        />
        <KpiCard
          label="Remaining"
          value={formatKesCompact(summary.budget_remaining)}
          hint="Budget left"
        />
        <KpiCard
          label="Days left"
          value={summary.days_remaining ?? "—"}
          hint={
            summary.days_remaining == null
              ? "Set an end date"
              : summary.days_remaining < 0
                ? "Past planned end"
                : "Until planned end"
          }
          tone={
            summary.days_remaining != null && summary.days_remaining < 0 ? "danger" : "default"
          }
        />
      </div>

      <nav className="proj-tabs" aria-label="Project sections">
        {TABS.map((tab) =>
          tab.id === "overview" ? (
            <span key={tab.id} className="proj-tabs__item is-active">
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.id}
              href={
                tab.id === "diary"
                  ? `/dashboard/diary?project=${project.id}`
                  : tab.id === "schedule"
                    ? `/dashboard/schedule?project=${project.id}`
                    : tab.href
              }
              className="proj-tabs__item"
            >
              {tab.label}
            </Link>
          ),
        )}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="dash-panel p-5">
          <h2 className="dash-panel__title">Project summary</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--gray-600)]">
            {project.description?.trim() ||
              "No description yet. Add notes about scope, phase, and delivery goals."}
          </p>

          <dl className="proj-detail__meta mt-5">
            <div>
              <dt>Site</dt>
              <dd>{project.site?.name ?? "Not linked"}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>
                {formatProjectDate(project.planned_start_date)} –{" "}
                {formatProjectDate(project.planned_end_date)}
              </dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{project.client_name || "—"}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {[project.client_email, project.client_phone].filter(Boolean).join(" · ") || "—"}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4">
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Quick links</h2>
            <div className="mt-3 grid gap-2">
              <Link href={`/dashboard/diary?project=${project.id}`} className="dash-quick-link">
                Site diary
              </Link>
              <Link href={`/dashboard/schedule?project=${project.id}`} className="dash-quick-link">
                Schedule / Gantt
              </Link>
              <Link href="/dashboard/tasks" className="dash-quick-link">
                Tasks
              </Link>
              <Link href="/dashboard/attendance" className="dash-quick-link">
                Attendance
              </Link>
              <Link href="/dashboard/procurement" className="dash-quick-link">
                Procurement
              </Link>
            </div>
          </section>
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Attention</h2>
            <ul className="dash-attention mt-3 space-y-2.5 text-sm text-[var(--gray-600)]">
              <li>
                {summary.has_site
                  ? "Site linked — ready for field modules."
                  : "Link a site so diary and attendance can attach."}
              </li>
              <li>
                {summary.team_members_count} team member
                {summary.team_members_count === 1 ? "" : "s"} on record.
              </li>
              <li>Module deep-links open as you build later phases.</li>
            </ul>
          </section>
          {canManage ? <ClientAccessPanel projectId={project.id} /> : null}
        </aside>
      </div>

      <ProjectFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={onSaved}
        initial={project}
      />
    </div>
  );
}
