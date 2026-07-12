"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { stockInItem, stockOutItem } from "@/lib/api/inventory";
import type { InventoryItem } from "@/lib/api/types";

type Props = {
  item: InventoryItem;
  mode: "in" | "out";
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
};

export function StockMovementModal({ item, mode, onClose, onSaved }: Props) {
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(String(item.unit_cost || "0"));
  const [movementType, setMovementType] = useState<"stock_out" | "wastage">("stock_out");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a positive quantity.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "in"
          ? await stockInItem(item.id, {
              quantity: qty,
              unit_cost: Number(unitCost) || undefined,
              notes: notes.trim() || undefined,
            })
          : await stockOutItem(item.id, {
              quantity: qty,
              movement_type: movementType,
              notes: notes.trim() || undefined,
            });
      onSaved(result.item);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Stock update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inv-modal">
      <button type="button" className="inv-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="inv-modal__panel inv-modal__panel--sm" role="dialog" aria-modal="true">
        <div className="inv-modal__head">
          <div>
            <p className="inv-modal__eyebrow">{item.name}</p>
            <h2 className="inv-modal__title">{mode === "in" ? "Stock in" : "Stock out"}</h2>
          </div>
          <button type="button" className="inv-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="inv-modal__body">
            {error ? <p className="inv-form-error">{error}</p> : null}
            <p className="text-sm text-[var(--gray-500)]">
              On hand: {item.quantity_on_hand} {item.unit}
            </p>
            <label className="inv-field">
              <span>Quantity ({item.unit})</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="inv-select"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
            {mode === "in" ? (
              <label className="inv-field">
                <span>Unit cost (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="inv-select"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </label>
            ) : (
              <label className="inv-field">
                <span>Type</span>
                <select
                  className="inv-select"
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as "stock_out" | "wastage")}
                >
                  <option value="stock_out">Issue to site</option>
                  <option value="wastage">Wastage</option>
                </select>
              </label>
            )}
            <label className="inv-field">
              <span>Notes</span>
              <textarea
                className="inv-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>
          <div className="inv-modal__actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : mode === "in" ? "Receive stock" : "Record out"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
