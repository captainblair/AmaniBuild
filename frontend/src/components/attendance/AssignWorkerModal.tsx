"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { assignWorker } from "@/lib/api/attendance";
import { fetchCompanyMembers } from "@/lib/api/team";
import type { CompanyMember, WorkerAssignment } from "@/lib/api/types";
import { WORKER_TRADES } from "@/lib/attendance/labels";

type Props = {
  projectId: string;
  assignments: WorkerAssignment[];
  onClose: () => void;
  onSaved: () => void;
};

export function AssignWorkerModal({ projectId, assignments, onClose, onSaved }: Props) {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [trade, setTrade] = useState("labourer");
  const [employeeCode, setEmployeeCode] = useState("");
  const [shiftStart, setShiftStart] = useState("07:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const assignedIds = useMemo(
    () => new Set(assignments.filter((a) => a.is_active).map((a) => a.worker)),
    [assignments],
  );

  const available = useMemo(
    () => members.filter((m) => m.is_active && !assignedIds.has(m.user_id)),
    [members, assignedIds],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchCompanyMembers()
      .then((list) => {
        if (cancelled) return;
        setMembers(list);
        const first = list.find((m) => m.is_active && !assignedIds.has(m.user_id));
        if (first) setWorkerId(first.user_id);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignedIds]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workerId) return;
    setBusy(true);
    setError(null);
    try {
      await assignWorker(projectId, {
        worker_id: workerId,
        trade,
        employee_code: employeeCode.trim() || undefined,
        shift_start_time: shiftStart,
        shift_end_time: shiftEnd,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not assign worker.");
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
            <p className="att-modal__eyebrow">Workforce</p>
            <h2 className="att-modal__title">Assign worker</h2>
          </div>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="att-modal__body">
            {error ? <p className="att-form-error">{error}</p> : null}
            {loadingMembers ? (
              <p className="text-sm text-[var(--gray-500)]">Loading team members…</p>
            ) : available.length === 0 ? (
              <p className="text-sm text-[var(--gray-500)]">
                All active company members are already assigned, or no members are available.
              </p>
            ) : (
              <>
                <label className="att-field">
                  <span>Team member</span>
                  <select
                    className="att-select"
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    required
                  >
                    {available.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user_name} · {m.role.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="att-form-grid">
                  <label className="att-field">
                    <span>Trade</span>
                    <select className="att-select" value={trade} onChange={(e) => setTrade(e.target.value)}>
                      {WORKER_TRADES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="att-field">
                    <span>Employee code</span>
                    <input
                      className="att-select"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <div className="att-form-grid">
                  <label className="att-field">
                    <span>Shift start</span>
                    <input
                      type="time"
                      className="att-select"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                    />
                  </label>
                  <label className="att-field">
                    <span>Shift end</span>
                    <input
                      type="time"
                      className="att-select"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="att-modal__actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !workerId || available.length === 0}>
              {busy ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
