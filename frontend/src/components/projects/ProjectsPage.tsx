"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ApiClientError } from "@/lib/api/client";
import { fetchProjects } from "@/lib/api/projects";
import type { Project, ProjectListItem } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { budgetUtilization, formatKesCompact } from "@/lib/format";
import { formatProjectDate, PROJECT_STATUSES, typeLabel } from "@/lib/projects/labels";

type ViewMode = "table" | "cards";

export function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_projects");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects({
        page,
        page_size: 12,
        status: status || undefined,
        search: search.trim() || undefined,
        ordering: "-created_at",
      });
      setProjects(data.results);
      setTotalPages(data.pagination.total_pages || 1);
      setCount(data.pagination.count);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage) {
      setFormOpen(true);
      router.replace("/dashboard/projects");
    }
  }, [searchParams, canManage, router]);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const delayed = projects.filter((p) => {
      const util = budgetUtilization(p.budget_spent, p.budget_total);
      return util > 95 && p.progress_percent < 80;
    }).length;
    const budget = projects.reduce((sum, p) => sum + Number(p.budget_total || 0), 0);
    const avgProgress = projects.length
      ? Math.round(projects.reduce((sum, p) => sum + p.progress_percent, 0) / projects.length)
      : 0;
    return { active, completed, delayed, budget, avgProgress };
  }, [projects]);

  function onSaved(project: Project) {
    router.push(`/dashboard/projects/${project.id}`);
  }

  return (
    <div className="proj-page space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--gray-500)]">Projects</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            Portfolio projects
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            {count} project{count === 1 ? "" : "s"} across your sites.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            + New Project
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total projects" value={count} hint="In this company" />
        <KpiCard label="Active" value={stats.active} hint="On this page" tone="success" />
        <KpiCard label="Completed" value={stats.completed} hint="On this page" />
        <KpiCard
          label="At risk"
          value={stats.delayed}
          hint="Budget pressure"
          tone={stats.delayed ? "danger" : "default"}
        />
        <KpiCard
          label="Page budget"
          value={formatKesCompact(stats.budget)}
          hint={`${stats.avgProgress}% avg progress`}
        />
      </div>

      <div className="proj-toolbar dash-panel">
        <input
          type="search"
          className="proj-toolbar__search"
          placeholder="Search by name, client, or location…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="proj-select proj-toolbar__status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="proj-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={view === "table" ? "is-active" : ""}
            onClick={() => setView("table")}
          >
            Table
          </button>
          <button
            type="button"
            className={view === "cards" ? "is-active" : ""}
            onClick={() => setView("cards")}
          >
            Cards
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading projects…" />
        </div>
      ) : error ? (
        <div className="dash-panel p-6 text-center">
          <p className="text-sm text-[var(--red)]">{error}</p>
          <Button type="button" className="mt-4" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty__title">No projects yet</p>
          <p className="dash-empty__text">
            Create your first project to track progress, budget, and site delivery.
          </p>
          {canManage ? (
            <button type="button" className="dash-empty__link" onClick={() => setFormOpen(true)}>
              Create project
            </button>
          ) : null}
        </div>
      ) : view === "cards" ? (
        <div className="proj-card-grid">
          {projects.map((project) => {
            const util = budgetUtilization(project.budget_spent, project.budget_total);
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="proj-card"
              >
                <div className="proj-card__top">
                  <ProjectStatusBadge
                    status={project.status}
                    progress={project.progress_percent}
                    utilization={util}
                    showHealth
                  />
                  <span className="proj-card__type">{typeLabel(project.project_type)}</span>
                </div>
                <h3 className="proj-card__title">{project.name}</h3>
                <p className="proj-card__meta">
                  {[project.site_name, project.site_city].filter(Boolean).join(" · ") || "No site"}
                </p>
                <div className="proj-card__progress">
                  <div className="proj-progress-track">
                    <div
                      className="proj-progress-fill"
                      style={{ width: `${Math.min(project.progress_percent, 100)}%` }}
                    />
                  </div>
                  <span>{project.progress_percent}%</span>
                </div>
                <div className="proj-card__footer">
                  <span>{formatKesCompact(project.budget_total)}</span>
                  <span>
                    {formatProjectDate(project.planned_start_date)} –{" "}
                    {formatProjectDate(project.planned_end_date)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="dash-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="proj-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Progress</th>
                  <th>Budget</th>
                  <th>Timeline</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const util = budgetUtilization(project.budget_spent, project.budget_total);
                  return (
                    <tr key={project.id}>
                      <td>
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="font-semibold text-[var(--navy)] hover:text-[var(--orange-hover)]"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-[var(--gray-500)]">
                          {[project.site_name, project.project_manager_name]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </td>
                      <td>{typeLabel(project.project_type)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="proj-progress-track w-20">
                            <div
                              className="proj-progress-fill"
                              style={{ width: `${Math.min(project.progress_percent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{project.progress_percent}%</span>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium">{formatKesCompact(project.budget_total)}</p>
                        <p className="text-xs text-[var(--gray-500)]">{util}% used</p>
                      </td>
                      <td className="text-xs text-[var(--gray-600)]">
                        {formatProjectDate(project.planned_start_date)}
                        <br />
                        {formatProjectDate(project.planned_end_date)}
                      </td>
                      <td>
                        <ProjectStatusBadge
                          status={project.status}
                          progress={project.progress_percent}
                          utilization={util}
                          showHealth
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-[var(--gray-600)]">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}
