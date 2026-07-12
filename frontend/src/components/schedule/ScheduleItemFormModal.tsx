"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createScheduleItem, updateScheduleItem } from "@/lib/api/schedule";
import type { CompanyMember, ScheduleItem, ScheduleItemWriteInput, SchedulePhase } from "@/lib/api/types";
import { SCHEDULE_STATUSES } from "@/lib/schedule/labels";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (item: ScheduleItem) => void;
  projectId: string;
  phases: SchedulePhase[];
  members: CompanyMember[];
  initial?: ScheduleItem | null;
  defaultMilestone?: boolean;
};

export function ScheduleItemFormModal({
  open,
  onClose,
  onSaved,
  projectId,
  phases,
  members,
  initial = null,
  defaultMilestone = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [progress, setProgress] = useState("0");
  const [status, setStatus] = useState("not_started");
  const [assigneeId, setAssigneeId] = useState("");
  const [isMilestone, setIsMilestone] = useState(false);
  const [color, setColor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description || "");
      setPhaseId(initial.phase_id || "");
      setStartDate(initial.start_date);
      setEndDate(initial.end_date);
      setProgress(String(initial.progress_percent));
      setStatus(initial.status);
      setAssigneeId(initial.assignee_id || "");
      setIsMilestone(initial.is_milestone);
      setColor(initial.color || "");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setTitle("");
      setDescription("");
      setPhaseId(phases[0]?.id || "");
      setStartDate(today);
      setEndDate(today);
      setProgress("0");
      setStatus("not_started");
      setAssigneeId("");
      setIsMilestone(defaultMilestone);
      setColor("");
    }
    setError(null);

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, initial, phases, defaultMilestone]);

  if (!mounted || !open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: ScheduleItemWriteInput = {
      title: title.trim(),
      description: description.trim(),
      phase_id: phaseId || null,
      start_date: startDate,
      end_date: endDate,
      progress_percent: Number(progress) || 0,
      status,
      is_milestone: isMilestone,
      assignee_id: assigneeId || null,
      color: color || undefined,
    };
    try {
      const item = initial
        ? await updateScheduleItem(initial.id, payload)
        : await createScheduleItem(projectId, payload);
      onSaved(item);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save schedule item.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="sch-modal" role="dialog" aria-modal="true" aria-labelledby="sch-modal-title">
      <button type="button" className="sch-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="sch-modal__panel">
        <header className="sch-modal__header">
          <h2 id="sch-modal-title">
            {initial ? "Edit schedule item" : isMilestone ? "Create milestone" : "Add schedule task"}
          </h2>
          <button type="button" className="sch-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <form onSubmit={(e) => void onSubmit(e)} className="sch-modal__body">
          {error ? <p className="sch-error">{error}</p> : null}

          <label className="sch-field">
            Title
            <input
              className="sch-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
            />
          </label>

          <label className="sch-field">
            Description
            <textarea
              className="sch-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          <div className="sch-field-row">
            <label className="sch-field">
              Start
              <input
                type="date"
                className="sch-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="sch-field">
              End
              <input
                type="date"
                className="sch-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="sch-field-row">
            <label className="sch-field">
              Status
              <select className="sch-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {SCHEDULE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sch-field">
              Progress %
              <input
                type="number"
                min={0}
                max={100}
                className="sch-input"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
            </label>
          </div>

          <div className="sch-field-row">
            <label className="sch-field">
              Phase
              <select className="sch-select" value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
                <option value="">No phase</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="sch-field">
              Assignee
              <select
                className="sch-select"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sch-field-row">
            <label className="sch-field">
              Bar color
              <input
                type="color"
                className="sch-input sch-input--color"
                value={color || "#3B82F6"}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <label className="sch-check">
              <input
                type="checkbox"
                checked={isMilestone}
                onChange={(e) => setIsMilestone(e.target.checked)}
              />
              Milestone
            </label>
          </div>

          <footer className="sch-modal__footer">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? "Saving…" : initial ? "Save changes" : "Create"}
            </Button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
