"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createInventoryItem, updateInventoryItem } from "@/lib/api/inventory";
import { fetchProjects } from "@/lib/api/projects";
import { fetchCompanySites } from "@/lib/api/sites";
import type { InventoryItem, InventoryItemWriteInput, ProjectListItem, Site } from "@/lib/api/types";
import { MATERIAL_CATEGORIES } from "@/lib/inventory/labels";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
  initial?: InventoryItem | null;
  defaultSiteId?: string;
};

export function InventoryItemFormModal({
  open,
  onClose,
  onSaved,
  initial,
  defaultSiteId = "",
}: Props) {
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [siteId, setSiteId] = useState(defaultSiteId);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("other");
  const [unit, setUnit] = useState("bags");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [unitCost, setUnitCost] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetchCompanySites()
      .then((list) => {
        setSites(list);
        if (!initial && !defaultSiteId && list[0]) setSiteId(list[0].id);
      })
      .catch(() => setSites([]));
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => setProjects(data.results))
      .catch(() => setProjects([]));

    if (initial) {
      setSiteId(initial.site);
      setProjectId(initial.project ?? "");
      setName(initial.name);
      setSku(initial.sku || "");
      setCategory(initial.category || "other");
      setUnit(initial.unit || "unit");
      setLocation(initial.location || "");
      setDescription(initial.description || "");
      setQuantity(String(initial.quantity_on_hand));
      setReorderLevel(String(initial.reorder_level));
      setUnitCost(String(initial.unit_cost));
    } else {
      setSiteId(defaultSiteId);
      setProjectId("");
      setName("");
      setSku("");
      setCategory("other");
      setUnit("bags");
      setLocation("");
      setDescription("");
      setQuantity("0");
      setReorderLevel("10");
      setUnitCost("0");
    }
    setError(null);
  }, [open, initial, defaultSiteId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!siteId || !name.trim()) {
      setError("Site and name are required.");
      return;
    }

    const payload: InventoryItemWriteInput = {
      site_id: siteId,
      project_id: projectId || null,
      name: name.trim(),
      sku: sku.trim() || undefined,
      category,
      unit: unit.trim() || "unit",
      location: location.trim(),
      description: description.trim(),
      quantity_on_hand: Number(quantity) || 0,
      reorder_level: Number(reorderLevel) || 0,
      unit_cost: Number(unitCost) || 0,
      currency: "KES",
    };

    setBusy(true);
    setError(null);
    try {
      const saved = initial
        ? await updateInventoryItem(initial.id, payload)
        : await createInventoryItem(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save item.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="inv-modal">
      <button type="button" className="inv-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="inv-modal__panel" role="dialog" aria-modal="true">
        <div className="inv-modal__head">
          <div>
            <p className="inv-modal__eyebrow">Inventory</p>
            <h2 className="inv-modal__title">{initial ? "Edit material" : "Add material"}</h2>
          </div>
          <button type="button" className="inv-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="inv-modal__body">
            {error ? <p className="inv-form-error">{error}</p> : null}
            <label className="inv-field">
              <span>Name</span>
              <input
                className="inv-select"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Portland cement 50kg"
                required
              />
            </label>
            <div className="inv-form-grid">
              <label className="inv-field">
                <span>Site</span>
                <select
                  className="inv-select"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  required
                >
                  <option value="">Select site</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inv-field">
                <span>Project (optional)</span>
                <select
                  className="inv-select"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="inv-form-grid">
              <label className="inv-field">
                <span>Category</span>
                <select
                  className="inv-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {MATERIAL_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inv-field">
                <span>SKU</span>
                <input className="inv-select" value={sku} onChange={(e) => setSku(e.target.value)} />
              </label>
            </div>
            <div className="inv-form-grid">
              <label className="inv-field">
                <span>Unit</span>
                <input className="inv-select" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </label>
              <label className="inv-field">
                <span>Store location</span>
                <input
                  className="inv-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Yard A"
                />
              </label>
            </div>
            <div className="inv-form-grid">
              <label className="inv-field">
                <span>Qty on hand</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="inv-select"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={Boolean(initial)}
                />
              </label>
              <label className="inv-field">
                <span>Reorder level</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="inv-select"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                />
              </label>
              <label className="inv-field">
                <span>Unit cost (KES)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="inv-select"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </label>
            </div>
            <label className="inv-field">
              <span>Description</span>
              <textarea
                className="inv-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {initial ? (
              <p className="text-xs text-[var(--gray-500)]">
                To change quantity, use Stock in / Stock out on the item page.
              </p>
            ) : null}
          </div>
          <div className="inv-modal__actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : initial ? "Save changes" : "Add material"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
