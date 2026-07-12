"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InspectionFormModal } from "@/components/inspections/InspectionFormModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchInspectionDashboard, fetchInspections } from "@/lib/api/inspections";
import { fetchProjects } from "@/lib/api/projects";
import type {
  Inspection,
  InspectionDashboard,
  InspectionListItem,
  ProjectListItem,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import {
  formatInspectionDate,
  INSPECTION_STATUSES,
  INSPECTION_TYPES,
  inspectionStatusLabel,
  inspectionTypeLabel,
  statusTone,
} from "@/lib/inspections/labels";

const emptyDashboard: InspectionDashboard = {
  total_inspections: 0,
  by_status: {
    draft: 0,
    scheduled: 0,
    in_progress: 0,
    submitted: 0,
    passed: 0,
    failed: 0,
  },
  overdue_count: 0,
  pass_rate_percent: 0,
  recent_failed: [],
};

export function InspectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_inspections");
  const canView = membership.permissions.includes("view_inspections");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [items, setItems] = useState<InspectionListItem[]>([]);
  const [dashboard, setDashboard] = useState<InspectionDashboard>(emptyDashboard);
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        const fromQuery = searchParams.get("project");
        if (fromQuery && data.results.some((p) => p.id === fromQuery)) setProjectId(fromQuery);
      })
      .catch(() => setProjects([]));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage) {
      setFormOpen(true);
      router.replace(projectId ? `/dashboard/inspections?project=${projectId}` : "/dashboard/inspections");
    }
  }, [searchParams, canManage, projectId, router]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view inspections.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, dash] = await Promise.all([
        fetchInspections({
          page_size: 50,
          project_id: projectId || undefined,
          status: status || undefined,
          inspection_type: inspectionType || undefined,
          search: search.trim() || undefined,
        }),
        fetchInspectionDashboard({ project_id: projectId || undefined }),
      ]);
      setItems(list.results);
      setDashboard(dash);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load inspections.");
    } finally {
      setLoading(false);
    }
  }, [canView, projectId, status, inspectionType, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function onCreated(inspection: Inspection) {
    router.push(`/dashboard/inspections/${inspection.id}`);
  }

  if (!canView) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">You do not have permission to view inspections.</p>
      </div>
    );
  }

  return (
    <div className="qa-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            Inspections
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            QA checklists, site findings, and pass/fail reviews.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            + New inspection
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total" value={dashboard.total_inspections} />
        <KpiCard label="In progress" value={dashboard.by_status.in_progress + dashboard.by_status.scheduled} />
        <KpiCard
          label="Overdue"
          value={dashboard.overdue_count}
          tone={dashboard.overdue_count ? "danger" : "default"}
        />
        <KpiCard
          label="Pass rate"
          value={`${dashboard.pass_rate_percent}%`}
          tone={dashboard.pass_rate_percent >= 80 ? "success" : "warn"}
          hint={`${dashboard.by_status.passed} passed · ${dashboard.by_status.failed} failed`}
        />
      </div>

      {error ? <p className="qa-error">{error}</p> : null}

      <div className="qa-toolbar dash-panel">
        <input
          type="search"
          className="qa-toolbar__search"
          placeholder="Search inspections…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select className="qa-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="qa-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {INSPECTION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="qa-select"
          value={inspectionType}
          onChange={(e) => setInspectionType(e.target.value)}
        >
          <option value="">All types</option>
          {INSPECTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading inspections…" />
        </div>
      ) : items.length === 0 ? (
        <div className="dash-panel p-8 text-center text-sm text-[var(--gray-500)]">
          No inspections match these filters.
        </div>
      ) : (
        <div className="dash-panel overflow-hidden">
          <div className="qa-table-wrap">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>Inspection</th>
                  <th>Type</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Scheduled</th>
                  <th>Inspector</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/dashboard/inspections/${item.id}`} className="qa-link">
                        <strong>{item.inspection_number}</strong>
                        <span>{item.title}</span>
                      </Link>
                    </td>
                    <td>{inspectionTypeLabel(item.inspection_type)}</td>
                    <td>{item.project_name}</td>
                    <td>
                      <span className={`qa-badge qa-badge--${statusTone(item.status)}`}>
                        {inspectionStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>{item.score_percent}%</td>
                    <td>{formatInspectionDate(item.scheduled_date)}</td>
                    <td>{item.inspector_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dashboard.recent_failed.length > 0 ? (
        <div className="dash-panel p-4">
          <h2 className="qa-section-title">Recent failed</h2>
          <ul className="qa-failed-list">
            {dashboard.recent_failed.map((item) => (
              <li key={item.id}>
                <Link href={`/dashboard/inspections/${item.id}`} className="qa-link">
                  <strong>{item.inspection_number}</strong>
                  <span>
                    {item.title} · {item.project__name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <InspectionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={onCreated}
        defaultProjectId={projectId}
      />
    </div>
  );
}
