"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createInspection } from "@/lib/api/inspections";
import { fetchProjects } from "@/lib/api/projects";
import { fetchCompanyMembers } from "@/lib/api/team";
import type { CompanyMember, Inspection, ProjectListItem } from "@/lib/api/types";
import { INSPECTION_TYPES } from "@/lib/inspections/labels";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (inspection: Inspection) => void;
  defaultProjectId?: string;
};

export function InspectionFormModal({ open, onClose, onCreated, defaultProjectId = "" }: Props) {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inspectionType, setInspectionType] = useState("general");
  const [areaLocation, setAreaLocation] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        if (!defaultProjectId && data.results[0]) setProjectId(data.results[0].id);
      })
      .catch(() => setProjects([]));
    void fetchCompanyMembers()
      .then((list) => setMembers(list.filter((m) => m.is_active)))
      .catch(() => setMembers([]));

    setProjectId(defaultProjectId);
    setTitle("");
    setDescription("");
    setInspectionType("general");
    setAreaLocation("");
    setScheduledDate("");
    setInspectorId("");
    setError(null);
    setBusy(false);
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, defaultProjectId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) {
      setError("Project and title are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const inspection = await createInspection({
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        inspection_type: inspectionType,
        area_location: areaLocation.trim(),
        scheduled_date: scheduledDate || null,
        inspector_id: inspectorId || null,
        use_template: true,
      });
      onCreated(inspection);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create inspection.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="qa-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form className="qa-modal" role="dialog" aria-modal="true" aria-label="New inspection" onSubmit={onSubmit}>
        <div className="qa-modal__head">
          <h2>New inspection</h2>
          <button type="button" className="qa-modal__close" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>
        <div className="qa-modal__body">
          {error ? <p className="qa-error">{error}</p> : null}
          <label className="qa-field">
            <span>Project</span>
            <select className="qa-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="qa-field">
            <span>Title</span>
            <input
              className="qa-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Level 5 structural QA"
              required
            />
          </label>
          <div className="qa-form-grid">
            <label className="qa-field">
              <span>Type</span>
              <select
                className="qa-select"
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
              >
                {INSPECTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="qa-field">
              <span>Scheduled date</span>
              <input
                type="date"
                className="qa-input"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </label>
          </div>
          <label className="qa-field">
            <span>Area / location</span>
            <input
              className="qa-input"
              value={areaLocation}
              onChange={(e) => setAreaLocation(e.target.value)}
              placeholder="Block A — Level 5"
            />
          </label>
          <label className="qa-field">
            <span>Inspector</span>
            <select className="qa-select" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
              <option value="">Assign to me</option>
              {members.map((m) => (
                <option key={m.id} value={m.user_id}>
                  {m.user_name}
                </option>
              ))}
            </select>
          </label>
          <label className="qa-field">
            <span>Description</span>
            <textarea
              className="qa-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
            />
          </label>
        </div>
        <div className="qa-modal__foot">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create inspection"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
