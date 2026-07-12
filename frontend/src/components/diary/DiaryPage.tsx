"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DiaryEntryFormModal } from "@/components/diary/DiaryEntryFormModal";
import { DiaryStatusBadge } from "@/components/diary/DiaryStatusBadge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchDiaryTimeline } from "@/lib/api/diary";
import { fetchProjects } from "@/lib/api/projects";
import type {
  DiaryEntry,
  DiaryInsights,
  DiaryTimelineGroup,
  ProjectListItem,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { DIARY_STATUSES, formatDiaryDate, weatherLabel } from "@/lib/diary/labels";

const emptyInsights: DiaryInsights = {
  total_entries: 0,
  approved_entries: 0,
  photos_uploaded: 0,
  materials_tracked: 0,
  issues_reported: 0,
  average_daily_progress: 0,
  weather_disruption_days: 0,
};

export function DiaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_diary");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [timeline, setTimeline] = useState<DiaryTimelineGroup[]>([]);
  const [insights, setInsights] = useState<DiaryInsights>(emptyInsights);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

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
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!projectId) {
      setTimeline([]);
      setInsights(emptyInsights);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDiaryTimeline(projectId, {
        status: status || undefined,
        search: search.trim() || undefined,
      });
      setTimeline(data.timeline);
      setInsights(data.insights);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load diary.");
    } finally {
      setLoading(false);
    }
  }, [projectId, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage && projectId) {
      setFormOpen(true);
      router.replace(`/dashboard/diary?project=${projectId}`);
    }
  }, [searchParams, canManage, projectId, router]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  function onSaved(entry: DiaryEntry) {
    router.push(`/dashboard/diary/${entry.id}`);
  }

  if (projects.length === 0 && !loading) {
    return (
      <div className="dash-empty">
        <p className="dash-empty__title">No projects yet</p>
        <p className="dash-empty__text">Create a project first, then log daily site diary entries.</p>
        <Link href="/dashboard/projects?new=1" className="dash-empty__link">
          Go to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="diary-page space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--gray-500)]">Site diary</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            Daily site reports
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            Capture progress, weather, workforce, and issues for each working day.
          </p>
        </div>
        {canManage && projectId ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            + New diary entry
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total entries" value={insights.total_entries} />
        <KpiCard label="Approved" value={insights.approved_entries} tone="success" />
        <KpiCard label="Issues reported" value={insights.issues_reported} tone={insights.issues_reported ? "danger" : "default"} />
        <KpiCard
          label="Avg daily progress"
          value={`${insights.average_daily_progress}%`}
          hint={`${insights.weather_disruption_days} weather disruption days`}
        />
      </div>

      <div className="diary-toolbar dash-panel">
        <select
          className="diary-select"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          className="diary-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {DIARY_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          className="diary-toolbar__search"
          placeholder="Search descriptions, delays, safety…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading diary…" />
        </div>
      ) : error ? (
        <div className="dash-panel p-6 text-center">
          <p className="text-sm text-[var(--red)]">{error}</p>
          <Button type="button" className="mt-4" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : timeline.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty__title">No diary entries yet</p>
          <p className="dash-empty__text">
            Log the first daily report for {selectedProject?.name ?? "this project"}.
          </p>
          {canManage ? (
            <button type="button" className="dash-empty__link" onClick={() => setFormOpen(true)}>
              Create entry
            </button>
          ) : null}
        </div>
      ) : (
        <div className="diary-timeline">
          {timeline.map((group) => (
            <section key={group.entry_date} className="diary-day">
              <div className="diary-day__rail" aria-hidden>
                <span className="diary-day__dot" />
                <span className="diary-day__line" />
              </div>
              <div className="diary-day__content">
                <h2 className="diary-day__date">{formatDiaryDate(group.entry_date)}</h2>
                <div className="space-y-3">
                  {group.entries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/dashboard/diary/${entry.id}`}
                      className="diary-card"
                    >
                      <div className="diary-card__top">
                        <DiaryStatusBadge status={entry.status} />
                        <span className="text-xs text-[var(--gray-500)]">
                          {weatherLabel(entry.weather_condition)}
                          {entry.weather_temperature_c
                            ? ` · ${entry.weather_temperature_c}°C`
                            : ""}
                        </span>
                      </div>
                      <p className="diary-card__title">
                        {entry.progress_percent}% progress · {entry.workforce_count} workers
                      </p>
                      <p className="diary-card__meta">
                        {[entry.supervisor_name || entry.created_by_name, entry.has_issues ? "Has issues" : null]
                          .filter(Boolean)
                          .join(" · ") || "Site diary entry"}
                        {entry.photo_count > 0 ? ` · ${entry.photo_count} photos` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedProject ? (
        <DiaryEntryFormModal
          open={formOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setFormOpen(false)}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  );
}
