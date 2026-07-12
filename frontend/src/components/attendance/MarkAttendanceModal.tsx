"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { markAttendance } from "@/lib/api/attendance";
import type { AttendanceWorkerCard } from "@/lib/api/types";
import { todayIso } from "@/lib/attendance/labels";

type Props = {
  projectId: string;
  workDate: string;
  workers: AttendanceWorkerCard[];
  initialWorkerId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function MarkAttendanceModal({
  projectId,
  workDate,
  workers,
  initialWorkerId,
  onClose,
  onSaved,
}: Props) {
  const [workerId, setWorkerId] = useState(initialWorkerId || workers[0]?.worker_id || "");
  const [date, setDate] = useState(workDate || todayIso());
  const [status, setStatus] = useState<"present" | "absent" | "late">("present");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialWorkerId) setWorkerId(initialWorkerId);
  }, [initialWorkerId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workerId) return;
    setBusy(true);
    setError(null);
    try {
      await markAttendance(projectId, {
        worker_id: workerId,
        work_date: date,
        status,
        notes: notes.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not mark attendance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="att-modal">
      <button type="button" className="att-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="att-modal__panel" role="dialog" aria-modal="true">
        <div className="att-modal__head">
          <div>
            <p className="att-modal__eyebrow">Attendance</p>
            <h2 className="att-modal__title">Mark attendance</h2>
          </div>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="att-modal__body">
            {error ? <p className="att-form-error">{error}</p> : null}
            <label className="att-field">
              <span>Worker</span>
              <select className="att-select" value={workerId} onChange={(e) => setWorkerId(e.target.value)} required>
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.full_name}
                  </option>
                ))}
              </select>
            </label>
            <div className="att-form-grid">
              <label className="att-field">
                <span>Date</span>
                <input
                  type="date"
                  className="att-select"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label className="att-field">
                <span>Status</span>
                <select
                  className="att-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "present" | "absent" | "late")}
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </label>
            </div>
            <label className="att-field">
              <span>Notes</span>
              <textarea
                className="att-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note"
              />
            </label>
          </div>
          <div className="att-modal__actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !workerId}>
              {busy ? "Saving…" : "Save mark"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
