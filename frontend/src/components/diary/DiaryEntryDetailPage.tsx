"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DiaryEntryFormModal } from "@/components/diary/DiaryEntryFormModal";
import { DiaryStatusBadge } from "@/components/diary/DiaryStatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  approveDiaryEntry,
  deleteDiaryEntry,
  fetchDiaryEntry,
  submitDiaryEntry,
} from "@/lib/api/diary";
import type { DiaryEntry } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatDiaryDate, weatherLabel } from "@/lib/diary/labels";

type Props = { entryId: string };

export function DiaryEntryDetailPage({ entryId }: Props) {
  const router = useRouter();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_diary");
  const canApprove = membership.permissions.includes("approve_diary");

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntry(await fetchDiaryEntry(entryId));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load diary entry.");
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: "submit" | "approve" | "delete") {
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "delete") {
        if (!window.confirm("Delete this draft diary entry?")) {
          setBusy(false);
          return;
        }
        await deleteDiaryEntry(entry.id);
        router.push(`/dashboard/diary?project=${entry.project}`);
        return;
      }
      const next =
        action === "submit" ? await submitDiaryEntry(entry.id) : await approveDiaryEntry(entry.id);
      setEntry(next);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading entry…" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="dash-panel mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-[var(--red)]">{error ?? "Entry not found."}</p>
        <Button href="/dashboard/diary" className="mt-4" variant="outline">
          Back to diary
        </Button>
      </div>
    );
  }

  const isDraft = entry.status === "draft";
  const isSubmitted = entry.status === "submitted";

  return (
    <div className="diary-detail space-y-5">
      <div className="diary-detail__crumb">
        <Link href={`/dashboard/diary?project=${entry.project}`}>Site diary</Link>
        <span>/</span>
        <span>{formatDiaryDate(entry.entry_date)}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <DiaryStatusBadge status={entry.status} />
            <span className="text-sm text-[var(--gray-500)]">
              {weatherLabel(entry.weather_condition)}
              {entry.weather_temperature_c ? ` · ${entry.weather_temperature_c}°C` : ""}
            </span>
          </div>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            {entry.project_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            {formatDiaryDate(entry.entry_date)} · {entry.workforce_count} workers ·{" "}
            {entry.working_hours}h · {entry.progress_percent}% progress
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && isDraft ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void runAction("delete")}
              >
                Delete
              </Button>
              <Button type="button" size="sm" disabled={busy} onClick={() => void runAction("submit")}>
                Submit diary
              </Button>
            </>
          ) : null}
          {canApprove && isSubmitted ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => void runAction("approve")}>
              Approve
            </Button>
          ) : null}
        </div>
      </header>

      {error ? <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="dash-panel p-5 space-y-4">
          <div>
            <h2 className="dash-panel__title">Work completed</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gray-600)]">
              {entry.work_description || "No description recorded."}
            </p>
          </div>

          {entry.labour_activities?.length ? (
            <div>
              <h3 className="text-sm font-semibold text-[var(--navy)]">Labour</h3>
              <div className="diary-tags mt-2">
                {entry.labour_activities.map((tag) => (
                  <span key={tag} className="diary-tag is-on">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {entry.equipment_used?.length ? (
            <div>
              <h3 className="text-sm font-semibold text-[var(--navy)]">Equipment</h3>
              <div className="diary-tags mt-2">
                {entry.equipment_used.map((tag) => (
                  <span key={tag} className="diary-tag is-on">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {(entry.delays || entry.safety_concerns || entry.required_actions) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--navy)]">Challenges & issues</h3>
              {entry.delays ? (
                <p className="text-sm text-[var(--gray-600)]">
                  <strong>Delays:</strong> {entry.delays}
                </p>
              ) : null}
              {entry.safety_concerns ? (
                <p className="text-sm text-[var(--gray-600)]">
                  <strong>Safety:</strong> {entry.safety_concerns}
                </p>
              ) : null}
              {entry.required_actions ? (
                <p className="text-sm text-[var(--gray-600)]">
                  <strong>Actions:</strong> {entry.required_actions}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Workflow</h2>
            <ol className="diary-preview__flow mt-3">
              <li className={entry.status === "draft" ? "is-on" : ""}>1. Draft</li>
              <li className={entry.status === "submitted" ? "is-on" : ""}>2. Submitted</li>
              <li className={entry.status === "approved" ? "is-on" : ""}>3. Approved</li>
            </ol>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--gray-500)]">Created by</dt>
                <dd className="font-medium text-[var(--navy)]">
                  {entry.created_by?.full_name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--gray-500)]">Submitted</dt>
                <dd className="font-medium text-[var(--navy)]">
                  {entry.submitted_at ? formatDiaryDate(entry.submitted_at) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--gray-500)]">Approved by</dt>
                <dd className="font-medium text-[var(--navy)]">
                  {entry.approved_by?.full_name ?? "—"}
                </dd>
              </div>
            </dl>
          </section>
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Site notes</h2>
            <p className="mt-3 text-sm text-[var(--gray-600)]">
              {entry.site_conditions_notes || "No extra site condition notes."}
            </p>
          </section>
        </aside>
      </div>

      <DiaryEntryFormModal
        open={editOpen}
        projectId={entry.project}
        projectName={entry.project_name}
        initial={entry}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => setEntry(next)}
      />
    </div>
  );
}
