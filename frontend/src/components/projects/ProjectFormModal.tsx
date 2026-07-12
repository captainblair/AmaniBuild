"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { createProject, updateProject } from "@/lib/api/projects";
import { fetchCompanySites } from "@/lib/api/sites";
import type { Project, ProjectWriteInput, Site } from "@/lib/api/types";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/projects/labels";

type ProjectFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (project: Project) => void;
  initial?: Project | null;
};

const emptyForm = {
  name: "",
  code: "",
  project_type: "residential",
  status: "planning",
  description: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  budget_total: "",
  planned_start_date: "",
  planned_end_date: "",
  site_id: "",
};

export function ProjectFormModal({ open, onClose, onSaved, initial }: ProjectFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [sites, setSites] = useState<Site[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        code: initial.code ?? "",
        project_type: initial.project_type,
        status: initial.status,
        description: initial.description ?? "",
        client_name: initial.client_name ?? "",
        client_email: initial.client_email ?? "",
        client_phone: initial.client_phone ?? "",
        budget_total: initial.budget_total ? String(Number(initial.budget_total)) : "",
        planned_start_date: initial.planned_start_date ?? "",
        planned_end_date: initial.planned_end_date ?? "",
        site_id: initial.site?.id ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
    void fetchCompanySites()
      .then(setSites)
      .catch(() => setSites([]));
  }, [open, initial]);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: ProjectWriteInput = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        project_type: form.project_type,
        status: form.status,
        description: form.description.trim() || undefined,
        client_name: form.client_name.trim() || undefined,
        client_email: form.client_email.trim() || undefined,
        client_phone: form.client_phone.trim() || undefined,
        budget_total: form.budget_total ? Number(form.budget_total) : 0,
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        site_id: form.site_id || null,
      };

      const project = initial
        ? await updateProject(initial.id, payload)
        : await createProject(payload);
      onSaved(project);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save project.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="proj-modal" role="dialog" aria-modal="true" aria-labelledby="proj-form-title">
      <button type="button" className="proj-modal__backdrop" aria-label="Close" onClick={onClose} />
      <form className="proj-modal__panel" onSubmit={onSubmit}>
        <div className="proj-modal__head">
          <div>
            <p className="proj-modal__eyebrow">{initial ? "Edit project" : "New project"}</p>
            <h2 id="proj-form-title" className="proj-modal__title">
              {initial ? initial.name : "Create a project"}
            </h2>
          </div>
          <button type="button" className="proj-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="proj-modal__body">
          <TextInput
            label="Project name"
            name="name"
            required
            placeholder="Riverside Heights Apartments"
            value={form.name}
            onChange={update("name")}
          />

          <div className="proj-form-grid">
            <TextInput
              label="Code"
              name="code"
              placeholder="RH-01"
              value={form.code}
              onChange={update("code")}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Type</label>
              <select
                className="proj-select"
                value={form.project_type}
                onChange={update("project_type")}
              >
                {PROJECT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="proj-form-grid">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Status</label>
              <select className="proj-select" value={form.status} onChange={update("status")}>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Site</label>
              <select className="proj-select" value={form.site_id} onChange={update("site_id")}>
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                    {site.city ? ` · ${site.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TextInput
            label="Budget total (KES)"
            name="budget_total"
            type="number"
            min="0"
            step="1000"
            placeholder="5000000"
            value={form.budget_total}
            onChange={update("budget_total")}
          />

          <div className="proj-form-grid">
            <TextInput
              label="Start date"
              name="planned_start_date"
              type="date"
              value={form.planned_start_date}
              onChange={update("planned_start_date")}
            />
            <TextInput
              label="End date"
              name="planned_end_date"
              type="date"
              value={form.planned_end_date}
              onChange={update("planned_end_date")}
            />
          </div>

          <TextInput
            label="Client name"
            name="client_name"
            placeholder="Optional"
            value={form.client_name}
            onChange={update("client_name")}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Description</label>
            <textarea
              className="proj-textarea"
              rows={3}
              value={form.description}
              onChange={update("description")}
              placeholder="Brief project notes…"
            />
          </div>

          {error ? <p className="proj-form-error">{error}</p> : null}
        </div>

        <div className="proj-modal__actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : initial ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
