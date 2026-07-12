"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressRing } from "@/components/portal/ProgressRing";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchClientPortalDashboard } from "@/lib/api/client-portal";
import type { ClientPortalDashboard } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact, parseMoney } from "@/lib/format";
import { firstName, greetingForNow } from "@/lib/nav/roles";
import { formatPortalDate, portalHealthLabel } from "@/lib/portal/labels";

export function ClientPortalHome() {
  const { user, membership } = useDashboardSession();
  const [data, setData] = useState<ClientPortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const dashboard = await fetchClientPortalDashboard();
        if (!cancelled) setData(dashboard);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Could not load client portal.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [membership.company_id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading portal…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dash-panel mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-[var(--red)]">{error ?? "Portal unavailable."}</p>
        <Button type="button" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const name = firstName(user.full_name || user.first_name);

  return (
    <div className="portal-page">
      <header className="portal-home__header">
        <div>
          <p className="portal-eyebrow">Client portal</p>
          <h1 className="portal-title">
            {greetingForNow()}, {name}
          </h1>
          <p className="portal-sub">
            Read-only progress for projects shared with you by {membership.company_name}.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Assigned projects" value={data.assigned_projects} />
        <KpiCard
          label="Average progress"
          value={`${Math.round(data.average_progress)}%`}
          tone="success"
        />
        <KpiCard label="Active" value={data.active_projects} />
        <KpiCard label="Completed" value={data.completed_projects} tone="success" />
      </div>

      {data.projects.length === 0 ? (
        <div className="dash-panel p-10 text-center">
          <p className="text-sm text-[var(--gray-500)]">
            No projects have been shared with you yet. Ask your contractor to grant portal access.
          </p>
        </div>
      ) : (
        <div className="portal-project-grid">
          {data.projects.map((project) => {
            const utilization =
              project.budget_total != null
                ? Math.round(
                    (parseMoney(project.budget_spent) / Math.max(parseMoney(project.budget_total), 1)) *
                      1000,
                  ) / 10
                : 0;
            const health = portalHealthLabel(
              project.status,
              project.progress_percent,
              utilization,
            );
            return (
              <Link
                key={project.id}
                href={`/dashboard/portal/${project.id}`}
                className="portal-project-card"
              >
                <div className="portal-project-card__top">
                  <div className="min-w-0 flex-1">
                    <p className="portal-project-card__code">{project.code || "Project"}</p>
                    <h2 className="portal-project-card__name">{project.name}</h2>
                    <p className="portal-project-card__meta">
                      {[project.site_name, project.project_manager_name]
                        .filter(Boolean)
                        .join(" · ") || membership.company_name}
                    </p>
                  </div>
                  <ProgressRing percent={project.progress_percent} size={88} stroke={7} />
                </div>
                <div className="portal-project-card__footer">
                  <span className={`portal-pill portal-pill--${health.tone}`}>{health.label}</span>
                  <span className="portal-project-card__dates">
                    {formatPortalDate(project.planned_start_date)} –{" "}
                    {formatPortalDate(project.planned_end_date)}
                  </span>
                  {project.budget_total != null ? (
                    <span className="portal-project-card__budget">
                      {formatKesCompact(project.budget_spent ?? 0)} of{" "}
                      {formatKesCompact(project.budget_total)}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
