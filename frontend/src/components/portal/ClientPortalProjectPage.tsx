"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProgressRing } from "@/components/portal/ProgressRing";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchClientPortalMilestones,
  fetchClientPortalOverview,
  fetchClientPortalPhotos,
  fetchClientPortalTimeline,
} from "@/lib/api/client-portal";
import type {
  ClientPortalMilestone,
  ClientPortalOverview,
  ClientPortalPhoto,
  ClientPortalTimelineItem,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import {
  formatPortalDate,
  formatPortalMonthYear,
  milestoneStageLabel,
  milestoneStageTone,
  portalHealthLabel,
} from "@/lib/portal/labels";

type TabId = "overview" | "photos" | "documents" | "messages";

type Props = { projectId: string };

export function ClientPortalProjectPage({ projectId }: Props) {
  const { membership } = useDashboardSession();
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<ClientPortalOverview | null>(null);
  const [timeline, setTimeline] = useState<ClientPortalTimelineItem[]>([]);
  const [photos, setPhotos] = useState<ClientPortalPhoto[]>([]);
  const [milestones, setMilestones] = useState<ClientPortalMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, tl, ph, ms] = await Promise.all([
        fetchClientPortalOverview(projectId),
        fetchClientPortalTimeline(projectId),
        fetchClientPortalPhotos(projectId),
        fetchClientPortalMilestones(projectId),
      ]);
      setOverview(ov);
      setTimeline(tl);
      setPhotos(ph);
      setMilestones(ms);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load project progress.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const health = useMemo(() => {
    if (!overview) return { label: "On Track", tone: "good" as const };
    const utilization = overview.budget?.utilization_percent ?? 0;
    return portalHealthLabel(overview.status, overview.progress_percent, utilization);
  }, [overview]);

  const stageItems = useMemo(() => {
    const sorted = [...milestones].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      const ad = a.due_date ?? "9999";
      const bd = b.due_date ?? "9999";
      return ad.localeCompare(bd);
    });
    return sorted.slice(0, 5);
  }, [milestones]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading progress…" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="dash-panel mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-[var(--red)]">{error ?? "Project not found."}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button href="/dashboard" variant="outline">
            Back to portal
          </Button>
          <Button type="button" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const budget = overview.budget;
  const heroPhoto = photos.find((p) => Boolean(p.url));
  const previewPhotos = photos.filter((p) => Boolean(p.url)).slice(0, 6);

  return (
    <div className="portal-page">
      <div className="portal-crumb">
        <Link href="/dashboard">Portal</Link>
        <span>/</span>
        <span>{overview.name}</span>
      </div>

      <nav className="portal-tabs" aria-label="Client portal sections">
        {(
          [
            ["overview", "Overview"],
            ["photos", "Photos"],
            ["documents", "Documents"],
            ["messages", "Messages"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`portal-tabs__item${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <>
          <section className="portal-hero">
            <div className="portal-hero__media">
              {heroPhoto?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroPhoto.url} alt={overview.name} />
              ) : (
                <div className="portal-hero__placeholder" aria-hidden>
                  <span>{overview.name.slice(0, 1)}</span>
                </div>
              )}
            </div>

            <div className="portal-hero__copy">
              <p className="portal-eyebrow">{overview.code || "Project"}</p>
              <h1 className="portal-hero__title">{overview.name}</h1>
              <p className="portal-hero__meta">
                {[overview.site_name, membership.company_name].filter(Boolean).join(" · ")}
              </p>
              {overview.project_manager_name ? (
                <p className="portal-hero__pm">PM: {overview.project_manager_name}</p>
              ) : null}
            </div>

            <div className="portal-hero__progress">
              <ProgressRing percent={overview.progress_percent} size={120} />
              <span className={`portal-pill portal-pill--${health.tone}`}>{health.label}</span>
              {budget ? (
                <p className="portal-hero__budget">
                  {formatKesCompact(budget.spent)} of {formatKesCompact(budget.total)}
                </p>
              ) : null}
              <p className="portal-hero__dates">
                Started {formatPortalMonthYear(overview.actual_start_date || overview.planned_start_date)}{" "}
                · Expected {formatPortalMonthYear(overview.planned_end_date)}
              </p>
            </div>

            <div className="portal-hero__timeline">
              <h2 className="portal-card__title">Project timeline</h2>
              {stageItems.length === 0 ? (
                <p className="portal-empty">Milestones will appear as work is planned.</p>
              ) : (
                <ol className="portal-stepper">
                  {stageItems.map((item) => {
                    const tone = milestoneStageTone(item.completed, item.status);
                    return (
                      <li key={item.id} className={`portal-stepper__item portal-stepper__item--${tone}`}>
                        <span className="portal-stepper__dot" aria-hidden />
                        <div>
                          <p className="portal-stepper__title">{item.title}</p>
                          <p className="portal-stepper__status">{milestoneStageLabel(tone)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>

          <div className="portal-grid">
            <div className="portal-col">
              <section className="portal-card">
                <h2 className="portal-card__title">Progress summary</h2>
                <div className="portal-progress-row">
                  <strong>{Math.round(overview.progress_percent)}% complete</strong>
                  <span className={`portal-pill portal-pill--${health.tone}`}>{health.label}</span>
                </div>
                <div className="portal-bar" aria-hidden>
                  <span style={{ width: `${Math.min(100, overview.progress_percent)}%` }} />
                </div>
                <dl className="portal-meta-grid">
                  <div>
                    <dt>Start</dt>
                    <dd>{formatPortalDate(overview.actual_start_date || overview.planned_start_date)}</dd>
                  </div>
                  <div>
                    <dt>Expected</dt>
                    <dd>{formatPortalDate(overview.planned_end_date)}</dd>
                  </div>
                  <div>
                    <dt>Days left</dt>
                    <dd>
                      {overview.days_remaining == null
                        ? "—"
                        : overview.days_remaining < 0
                          ? `${Math.abs(overview.days_remaining)} overdue`
                          : overview.days_remaining}
                    </dd>
                  </div>
                  <div>
                    <dt>Tasks done</dt>
                    <dd>
                      {overview.stats.tasks_completed}/{overview.stats.tasks_total}
                    </dd>
                  </div>
                </dl>
              </section>

              {budget ? (
                <section className="portal-card">
                  <h2 className="portal-card__title">Budget summary</h2>
                  <dl className="portal-budget">
                    <div>
                      <dt>Total budget</dt>
                      <dd>{formatKesCompact(budget.total)}</dd>
                    </div>
                    <div>
                      <dt>Spent to date</dt>
                      <dd>
                        {formatKesCompact(budget.spent)}{" "}
                        <span className="portal-muted">
                          ({Math.round(budget.utilization_percent)}%)
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <div className="portal-bar portal-bar--green" aria-hidden>
                    <span
                      style={{
                        width: `${Math.min(100, budget.utilization_percent || 0)}%`,
                      }}
                    />
                  </div>
                  <p className="portal-footnote">Budget updates provided by your contractor.</p>
                </section>
              ) : (
                <section className="portal-card">
                  <h2 className="portal-card__title">Budget summary</h2>
                  <p className="portal-empty">Budget details are not shared for this project.</p>
                </section>
              )}
            </div>

            <div className="portal-col">
              <section className="portal-card">
                <div className="portal-card__head">
                  <h2 className="portal-card__title">Recent site updates</h2>
                </div>
                {timeline.length === 0 ? (
                  <p className="portal-empty">Approved diary updates will show here.</p>
                ) : (
                  <ul className="portal-timeline">
                    {timeline.slice(0, 5).map((entry) => (
                      <li key={entry.id}>
                        <time dateTime={entry.entry_date}>{formatPortalDate(entry.entry_date)}</time>
                        <p className="portal-timeline__title">{entry.title}</p>
                        <p className="portal-timeline__summary">
                          {entry.summary || "Site progress update."}
                        </p>
                        {entry.has_issues ? (
                          <span className="portal-pill portal-pill--risk">Issues noted</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="portal-card__foot">
                  {overview.stats.approved_diary_entries} approved diary entr
                  {overview.stats.approved_diary_entries === 1 ? "y" : "ies"} shared.
                </p>
              </section>

              <section className="portal-card portal-card--soft">
                <h2 className="portal-card__title">Pending approvals</h2>
                <p className="portal-empty">
                  No change requests awaiting your review. When your contractor shares one, it will
                  appear here.
                </p>
              </section>
            </div>

            <div className="portal-col">
              <section className="portal-card">
                <div className="portal-card__head">
                  <h2 className="portal-card__title">Photo progress</h2>
                  <button type="button" className="portal-link" onClick={() => setTab("photos")}>
                    View all photos
                  </button>
                </div>
                {previewPhotos.length === 0 ? (
                  <p className="portal-empty">Site photos will appear as they are shared.</p>
                ) : (
                  <div className="portal-photo-grid">
                    {previewPhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="portal-photo"
                        title={photo.title}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.title} />
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <section className="portal-card">
                <h2 className="portal-card__title">Message from project manager</h2>
                {overview.project_manager_name ? (
                  <div className="portal-pm">
                    <span className="portal-pm__avatar" aria-hidden>
                      {overview.project_manager_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className="portal-pm__name">{overview.project_manager_name}</p>
                      <p className="portal-pm__role">Project Manager · {membership.company_name}</p>
                      <p className="portal-pm__note">
                        Progress is updated from approved site diary entries and shared photos.
                        Reach out via Help & Support if you need clarification.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="portal-empty">No project manager listed yet.</p>
                )}
              </section>
            </div>
          </div>

          <section className="portal-card">
            <div className="portal-card__head">
              <h2 className="portal-card__title">Documents shared with you</h2>
              <button type="button" className="portal-link" onClick={() => setTab("documents")}>
                View all documents
              </button>
            </div>
            <p className="portal-empty">
              Shared reports and files will appear here when your contractor publishes them to the
              portal.
            </p>
          </section>
        </>
      ) : null}

      {tab === "photos" ? (
        <section className="portal-card">
          <div className="portal-card__head">
            <h2 className="portal-card__title">Site photos</h2>
            <span className="portal-muted">{photos.length} shared</span>
          </div>
          {photos.filter((p) => p.url).length === 0 ? (
            <p className="portal-empty">No photos shared yet.</p>
          ) : (
            <div className="portal-photo-grid portal-photo-grid--lg">
              {photos
                .filter((p) => p.url)
                .map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="portal-photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.title} />
                    <span className="portal-photo__cap">
                      {photo.title}
                      <small>{formatPortalDate(photo.captured_at)}</small>
                    </span>
                  </a>
                ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="portal-card">
          <h2 className="portal-card__title">Shared documents</h2>
          <p className="portal-empty mt-3">
            Document sharing for clients is read-only and appears when the contractor publishes
            files to this project. In the meantime, use Photos and site updates for progress
            evidence.
          </p>
        </section>
      ) : null}

      {tab === "messages" ? (
        <section className="portal-card">
          <h2 className="portal-card__title">Messages</h2>
          <p className="portal-empty mt-3">
            Direct messaging is not enabled on the client portal yet. Contact{" "}
            {overview.project_manager_name || "your project manager"} through{" "}
            <Link href="/dashboard/help" className="portal-link">
              Help & Support
            </Link>
            .
          </p>
        </section>
      ) : null}
    </div>
  );
}
