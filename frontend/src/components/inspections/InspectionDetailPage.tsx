"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchInspection,
  reviewInspection,
  startInspection,
  submitInspection,
  updateInspection,
} from "@/lib/api/inspections";
import type { Inspection, InspectionChecklistItem, InspectionResult } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import {
  formatInspectionDate,
  formatInspectionDateTime,
  inspectionResultLabel,
  inspectionStatusLabel,
  inspectionTypeLabel,
  INSPECTION_RESULTS,
  statusTone,
} from "@/lib/inspections/labels";

type Props = {
  inspectionId: string;
};

export function InspectionDetailPage({ inspectionId }: Props) {
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_inspections");
  const canApprove = membership.permissions.includes("approve_inspections");
  const canView = membership.permissions.includes("view_inspections");

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<InspectionResult>("pass");
  const [reviewNotes, setReviewNotes] = useState("");

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view inspections.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInspection(inspectionId);
      setInspection(data);
      setChecklist(data.checklist_items || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load inspection.");
    } finally {
      setLoading(false);
    }
  }, [canView, inspectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = useMemo(
    () =>
      canManage &&
      !!inspection &&
      ["draft", "scheduled", "in_progress"].includes(inspection.status),
    [canManage, inspection],
  );

  const groupedChecklist = useMemo(() => {
    const groups: Record<string, InspectionChecklistItem[]> = {};
    for (const item of checklist) {
      const key = item.section || "General";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups);
  }, [checklist]);

  function setItemStatus(id: string, status: "pass" | "fail" | "pending") {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  function setItemNotes(id: string, notes: string) {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, notes } : item)));
  }

  async function saveChecklist() {
    if (!inspection) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateInspection(inspection.id, {
        title: inspection.title,
        checklist_items: checklist,
      });
      setInspection(updated);
      setChecklist(updated.checklist_items || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save checklist.");
    } finally {
      setBusy(false);
    }
  }

  async function onStart() {
    if (!inspection) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await startInspection(inspection.id);
      setInspection(updated);
      setChecklist(updated.checklist_items || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start inspection.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!inspection) return;
    setBusy(true);
    setError(null);
    try {
      await updateInspection(inspection.id, {
        title: inspection.title,
        checklist_items: checklist,
      });
      const updated = await submitInspection(inspection.id);
      setInspection(updated);
      setChecklist(updated.checklist_items || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not submit inspection.");
    } finally {
      setBusy(false);
    }
  }

  async function onReview() {
    if (!inspection) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await reviewInspection(inspection.id, {
        result: reviewResult,
        notes: reviewNotes.trim(),
      });
      setInspection(updated);
      setChecklist(updated.checklist_items || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not review inspection.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading inspection…" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">{error || "Inspection not found."}</p>
        <Link href="/dashboard/inspections" className="qa-link mt-3 inline-block">
          Back to inspections
        </Link>
      </div>
    );
  }

  return (
    <div className="qa-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/inspections" className="qa-back">
            ← Inspections
          </Link>
          <p className="qa-detail__number">{inspection.inspection_number}</p>
          <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            {inspection.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            {inspectionTypeLabel(inspection.inspection_type)}
            {inspection.area_location ? ` · ${inspection.area_location}` : ""}
            {` · ${inspection.project_name}`}
          </p>
        </div>
        <span className={`qa-badge qa-badge--${statusTone(inspection.status)}`}>
          {inspectionStatusLabel(inspection.status)}
        </span>
      </div>

      {error ? <p className="qa-error">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="qa-meta-card">
          <span>Score</span>
          <strong>{inspection.score_percent}%</strong>
        </div>
        <div className="qa-meta-card">
          <span>Result</span>
          <strong>{inspectionResultLabel(inspection.result)}</strong>
        </div>
        <div className="qa-meta-card">
          <span>Scheduled</span>
          <strong>{formatInspectionDate(inspection.scheduled_date)}</strong>
        </div>
        <div className="qa-meta-card">
          <span>Inspector</span>
          <strong>{inspection.inspector_name || "—"}</strong>
        </div>
      </div>

      <div className="qa-actions">
        {canManage && ["draft", "scheduled"].includes(inspection.status) ? (
          <Button type="button" disabled={busy} onClick={() => void onStart()}>
            Start inspection
          </Button>
        ) : null}
        {editable ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void saveChecklist()}>
            Save checklist
          </Button>
        ) : null}
        {canManage && inspection.status === "in_progress" ? (
          <Button type="button" disabled={busy} onClick={() => void onSubmit()}>
            Submit for review
          </Button>
        ) : null}
      </div>

      {inspection.description ? (
        <div className="dash-panel p-4">
          <h2 className="qa-section-title">Description</h2>
          <p className="text-sm text-[var(--gray-600)]">{inspection.description}</p>
        </div>
      ) : null}

      <div className="dash-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="qa-section-title">Checklist</h2>
          <span className="text-xs text-[var(--gray-500)]">
            {checklist.filter((i) => i.status === "pass").length}/{checklist.length} passed
          </span>
        </div>

        {groupedChecklist.length === 0 ? (
          <p className="text-sm text-[var(--gray-500)]">No checklist items.</p>
        ) : (
          groupedChecklist.map(([section, items]) => (
            <div key={section} className="qa-checklist-section">
              <h3>{section}</h3>
              <ul>
                {items.map((item) => (
                  <li key={item.id} className="qa-check-item">
                    <div className="qa-check-item__main">
                      <p>
                        {item.description}
                        {item.required ? <em>Required</em> : null}
                      </p>
                      {editable ? (
                        <div className="qa-check-item__actions">
                          <button
                            type="button"
                            className={item.status === "pass" ? "is-active is-pass" : ""}
                            onClick={() => setItemStatus(item.id, "pass")}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            className={item.status === "fail" ? "is-active is-fail" : ""}
                            onClick={() => setItemStatus(item.id, "fail")}
                          >
                            Fail
                          </button>
                          <button
                            type="button"
                            className={item.status === "pending" ? "is-active" : ""}
                            onClick={() => setItemStatus(item.id, "pending")}
                          >
                            Pending
                          </button>
                        </div>
                      ) : (
                        <span className={`qa-badge qa-badge--${item.status === "pass" ? "good" : item.status === "fail" ? "danger" : "muted"}`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    {editable ? (
                      <input
                        className="qa-input"
                        value={item.notes || ""}
                        onChange={(e) => setItemNotes(item.id, e.target.value)}
                        placeholder="Notes"
                      />
                    ) : item.notes ? (
                      <p className="qa-check-item__notes">{item.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {inspection.findings?.length ? (
        <div className="dash-panel p-4">
          <h2 className="qa-section-title">Findings</h2>
          <ul className="qa-findings">
            {inspection.findings.map((finding) => (
              <li key={finding.id}>
                <strong>{finding.severity}</strong>
                <span>{finding.description}</span>
                <em>{finding.resolved ? "Resolved" : "Open"}</em>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canApprove && inspection.status === "submitted" ? (
        <div className="dash-panel p-4">
          <h2 className="qa-section-title">Review</h2>
          <div className="qa-review">
            <label className="qa-field">
              <span>Result</span>
              <select
                className="qa-select"
                value={reviewResult}
                onChange={(e) => setReviewResult(e.target.value)}
              >
                {INSPECTION_RESULTS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="qa-field">
              <span>Notes</span>
              <textarea
                className="qa-textarea"
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Reviewer notes"
              />
            </label>
            <Button type="button" disabled={busy} onClick={() => void onReview()}>
              Submit review
            </Button>
          </div>
        </div>
      ) : null}

      <div className="dash-panel p-4 text-sm text-[var(--gray-500)]">
        Created {formatInspectionDateTime(inspection.created_at)}
        {inspection.submitted_at ? ` · Submitted ${formatInspectionDateTime(inspection.submitted_at)}` : ""}
        {inspection.reviewed_at
          ? ` · Reviewed ${formatInspectionDateTime(inspection.reviewed_at)}${inspection.reviewed_by_name ? ` by ${inspection.reviewed_by_name}` : ""}`
          : ""}
      </div>
    </div>
  );
}
