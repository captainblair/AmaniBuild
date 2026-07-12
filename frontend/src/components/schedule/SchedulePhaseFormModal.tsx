"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createSchedulePhase } from "@/lib/api/schedule";
import type { SchedulePhase } from "@/lib/api/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (phase: SchedulePhase) => void;
  projectId: string;
};

export function SchedulePhaseFormModal({ open, onClose, onSaved, projectId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#eab308");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setName("");
    setColor("#eab308");
    setError(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const phase = await createSchedulePhase(projectId, { name: name.trim(), color });
      onSaved(phase);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create phase.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="sch-modal" role="dialog" aria-modal="true" aria-labelledby="sch-phase-title">
      <button type="button" className="sch-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="sch-modal__panel sch-modal__panel--sm">
        <header className="sch-modal__header">
          <h2 id="sch-phase-title">Create phase</h2>
          <button type="button" className="sch-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <form onSubmit={(e) => void onSubmit(e)} className="sch-modal__body">
          {error ? <p className="sch-error">{error}</p> : null}
          <label className="sch-field">
            Phase name
            <input
              className="sch-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Superstructure"
            />
          </label>
          <label className="sch-field">
            Color
            <input
              type="color"
              className="sch-input sch-input--color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <footer className="sch-modal__footer">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Create phase"}
            </Button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
