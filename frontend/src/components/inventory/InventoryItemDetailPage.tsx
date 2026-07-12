"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InventoryItemFormModal } from "@/components/inventory/InventoryItemFormModal";
import { StockMovementModal } from "@/components/inventory/StockMovementModal";
import { StockStatusBadge } from "@/components/inventory/StockStatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  archiveInventoryItem,
  fetchInventoryItem,
  fetchItemMovements,
} from "@/lib/api/inventory";
import type { InventoryItem, StockMovement } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import { materialCategoryLabel, movementTypeLabel } from "@/lib/inventory/labels";

type Props = { itemId: string };

export function InventoryItemDetailPage({ itemId }: Props) {
  const router = useRouter();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_inventory");

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [stockMode, setStockMode] = useState<"in" | "out" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, history] = await Promise.all([
        fetchInventoryItem(itemId),
        fetchItemMovements(itemId),
      ]);
      setItem(detail);
      setMovements(history);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load item.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onArchive() {
    if (!item) return;
    if (!window.confirm(`Archive “${item.name}”?`)) return;
    setBusy(true);
    try {
      await archiveInventoryItem(item.id);
      router.push("/dashboard/inventory");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not archive item.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading material…" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="dash-panel mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-[var(--red)]">{error ?? "Item not found."}</p>
        <Button href="/dashboard/inventory" className="mt-4" variant="outline">
          Back to inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="inv-detail space-y-5">
      <div className="inv-detail__crumb">
        <Link href="/dashboard/inventory">Inventory</Link>
        <span>/</span>
        <span>{item.name}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StockStatusBadge status={item.stock_status} />
            <span className="text-sm text-[var(--gray-500)]">
              {materialCategoryLabel(item.category)}
            </span>
          </div>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            {item.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            {item.site_name}
            {item.project_name ? ` · ${item.project_name}` : ""}
            {item.sku ? ` · ${item.sku}` : ""}
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setStockMode("out")}>
              Stock out
            </Button>
            <Button type="button" size="sm" onClick={() => setStockMode("in")}>
              Stock in
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onArchive()}>
              Archive
            </Button>
          </div>
        ) : null}
      </header>

      {error ? <p className="inv-form-error">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="inv-stat">
          <p className="inv-stat__label">On hand</p>
          <p className="inv-stat__value">
            {item.quantity_on_hand} {item.unit}
          </p>
        </div>
        <div className="inv-stat">
          <p className="inv-stat__label">Reorder level</p>
          <p className="inv-stat__value">
            {item.reorder_level} {item.unit}
          </p>
        </div>
        <div className="inv-stat">
          <p className="inv-stat__label">Unit cost</p>
          <p className="inv-stat__value">{formatKesCompact(item.unit_cost)}</p>
        </div>
        <div className="inv-stat">
          <p className="inv-stat__label">Stock value</p>
          <p className="inv-stat__value">{formatKesCompact(item.stock_value)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="dash-panel p-5 space-y-3">
          <h2 className="dash-panel__title">Details</h2>
          <dl className="inv-meta">
            <div>
              <dt>Location</dt>
              <dd>{item.location || "—"}</dd>
            </div>
            <div>
              <dt>Below reorder by</dt>
              <dd>
                {Number(item.below_reorder_by) > 0
                  ? `${item.below_reorder_by} ${item.unit}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{item.is_active ? "Yes" : "No"}</dd>
            </div>
          </dl>
          {item.description ? (
            <p className="whitespace-pre-wrap text-sm text-[var(--gray-600)]">{item.description}</p>
          ) : null}
        </section>

        <section className="dash-panel p-5">
          <h2 className="dash-panel__title">Movement history</h2>
          {movements.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--gray-500)]">No movements recorded yet.</p>
          ) : (
            <ul className="inv-activity mt-3">
              {movements.map((m) => (
                <li key={m.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--navy)]">
                      {movementTypeLabel(m.movement_type)}
                    </p>
                    <p className="text-sm font-medium">
                      {m.quantity} {m.unit}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--gray-500)]">
                    Balance {m.balance_after}
                    {m.performed_by_name ? ` · ${m.performed_by_name}` : ""} ·{" "}
                    {new Date(m.created_at).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {m.notes ? <p className="mt-1 text-sm text-[var(--gray-600)]">{m.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <InventoryItemFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setItem(saved);
          void load();
        }}
        initial={item}
      />

      {stockMode ? (
        <StockMovementModal
          item={item}
          mode={stockMode}
          onClose={() => setStockMode(null)}
          onSaved={(saved) => {
            setItem(saved);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
