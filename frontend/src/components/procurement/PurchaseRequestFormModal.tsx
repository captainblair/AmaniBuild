"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createPurchaseRequest, updatePurchaseRequest } from "@/lib/api/procurement";
import { fetchProjects } from "@/lib/api/projects";
import type { ProjectListItem, PurchaseRequest, PurchaseRequestWriteInput } from "@/lib/api/types";
import { PURCHASE_CATEGORIES } from "@/lib/procurement/labels";

type LineForm = {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (request: PurchaseRequest) => void;
  initial?: PurchaseRequest | null;
  defaultProjectId?: string;
};

const emptyLine = (): LineForm => ({
  description: "",
  quantity: "1",
  unit: "unit",
  unit_price: "0",
});

export function PurchaseRequestFormModal({
  open,
  onClose,
  onSaved,
  initial,
  defaultProjectId = "",
}: Props) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("materials");
  const [justification, setJustification] = useState("");
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => setProjects(data.results))
      .catch(() => setProjects([]));

    if (initial) {
      setProjectId(initial.project);
      setTitle(initial.title);
      setCategory(initial.category || "materials");
      setJustification(initial.justification || "");
      setLines(
        initial.lines.length
          ? initial.lines.map((l) => ({
              description: l.description,
              quantity: String(l.quantity),
              unit: l.unit || "unit",
              unit_price: String(l.unit_price),
            }))
          : [emptyLine()],
      );
    } else {
      setProjectId(defaultProjectId);
      setTitle("");
      setCategory("materials");
      setJustification("");
      setLines([emptyLine()]);
    }
    setError(null);
  }, [open, initial, defaultProjectId]);

  const estimatedTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unit_price) || 0;
        return sum + qty * price;
      }, 0),
    [lines],
  );

  function updateLine(index: number, field: keyof LineForm, value: string) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanLines = lines
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity) || 0,
        unit: l.unit.trim() || "unit",
        unit_price: Number(l.unit_price) || 0,
      }))
      .filter((l) => l.description);

    if (!projectId || !title.trim()) {
      setError("Project and title are required.");
      return;
    }
    if (!cleanLines.length) {
      setError("Add at least one line item.");
      return;
    }

    const payload: PurchaseRequestWriteInput = {
      project_id: projectId,
      title: title.trim(),
      category,
      justification: justification.trim(),
      currency: "KES",
      lines: cleanLines,
    };

    setBusy(true);
    setError(null);
    try {
      const saved = initial
        ? await updatePurchaseRequest(initial.id, payload)
        : await createPurchaseRequest(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save purchase request.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="proc-modal">
      <button type="button" className="proc-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="proc-modal__panel" role="dialog" aria-modal="true">
        <div className="proc-modal__head">
          <div>
            <p className="proc-modal__eyebrow">Procurement</p>
            <h2 className="proc-modal__title">
              {initial ? "Edit purchase request" : "New purchase request"}
            </h2>
          </div>
          <button type="button" className="proc-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="proc-modal__body">
            {error ? <p className="proc-form-error">{error}</p> : null}
            <label className="proc-field">
              <span>Project</span>
              <select
                className="proc-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                disabled={Boolean(initial)}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="proc-field">
              <span>Title</span>
              <input
                className="proc-select"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cement and steel for block A"
                required
              />
            </label>
            <div className="proc-form-grid">
              <label className="proc-field">
                <span>Category</span>
                <select
                  className="proc-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {PURCHASE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="proc-field">
                <span>Estimated total</span>
                <p className="proc-estimate">
                  KES {estimatedTotal.toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <label className="proc-field">
              <span>Justification</span>
              <textarea
                className="proc-textarea"
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Why is this purchase needed?"
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--navy)]">Line items</p>
                <button
                  type="button"
                  className="proc-link-btn"
                  onClick={() => setLines((current) => [...current, emptyLine()])}
                >
                  + Add line
                </button>
              </div>
              {lines.map((line, index) => (
                <div key={index} className="proc-line">
                  <input
                    className="proc-select"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(index, "description", e.target.value)}
                  />
                  <div className="proc-line__meta">
                    <input
                      className="proc-select"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", e.target.value)}
                    />
                    <input
                      className="proc-select"
                      placeholder="Unit"
                      value={line.unit}
                      onChange={(e) => updateLine(index, "unit", e.target.value)}
                    />
                    <input
                      className="proc-select"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                    />
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        className="proc-link-btn"
                        onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="proc-modal__actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : initial ? "Save changes" : "Create draft"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
