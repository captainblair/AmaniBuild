"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryItemFormModal } from "@/components/inventory/InventoryItemFormModal";
import { StockStatusBadge } from "@/components/inventory/StockStatusBadge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchInventoryDashboard, fetchInventoryItems } from "@/lib/api/inventory";
import { fetchCompanySites } from "@/lib/api/sites";
import type {
  InventoryDashboard,
  InventoryItem,
  InventoryItemListItem,
  InventoryStatusCounts,
  Site,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import {
  MATERIAL_CATEGORIES,
  materialCategoryLabel,
  movementTypeLabel,
  STOCK_STATUSES,
} from "@/lib/inventory/labels";

const emptyCounts: InventoryStatusCounts = {
  all: 0,
  low_stock: 0,
  at_risk: 0,
  on_track: 0,
};

const emptyDashboard: InventoryDashboard = {
  total_materials: 0,
  low_stock_alerts: 0,
  at_risk_alerts: 0,
  stock_value_total: "0",
  currency: "KES",
  wastage_percent_this_month: 0,
  category_breakdown: [],
  low_stock_items: [],
  recent_movements: [],
};

export function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_inventory");

  const [sites, setSites] = useState<Site[]>([]);
  const [items, setItems] = useState<InventoryItemListItem[]>([]);
  const [counts, setCounts] = useState<InventoryStatusCounts>(emptyCounts);
  const [dashboard, setDashboard] = useState<InventoryDashboard>(emptyDashboard);
  const [siteId, setSiteId] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void fetchCompanySites()
      .then((list) => {
        setSites(list);
        const fromQuery = searchParams.get("site");
        if (fromQuery && list.some((s) => s.id === fromQuery)) setSiteId(fromQuery);
      })
      .catch(() => setSites([]));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage) {
      setFormOpen(true);
      router.replace(siteId ? `/dashboard/inventory?site=${siteId}` : "/dashboard/inventory");
    }
  }, [searchParams, canManage, siteId, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, dash] = await Promise.all([
        fetchInventoryItems({
          page_size: 50,
          site_id: siteId || undefined,
          category: category || undefined,
          status: status || undefined,
          search: search.trim() || undefined,
        }),
        fetchInventoryDashboard({ site_id: siteId || undefined }),
      ]);
      setItems(list.results);
      setCounts(list.status_counts ?? emptyCounts);
      setDashboard(dash);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }, [siteId, category, status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSaved(item: InventoryItem) {
    router.push(`/dashboard/inventory/${item.id}`);
  }

  return (
    <div className="inv-page space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--gray-500)]">Inventory</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            Stock management
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            Track materials, reorder levels, and stock movements across sites.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            + Add material
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Materials" value={dashboard.total_materials || counts.all} />
        <KpiCard
          label="Low stock"
          value={dashboard.low_stock_alerts || counts.low_stock}
          tone={(dashboard.low_stock_alerts || counts.low_stock) ? "danger" : "default"}
        />
        <KpiCard
          label="At risk"
          value={dashboard.at_risk_alerts || counts.at_risk}
          tone={(dashboard.at_risk_alerts || counts.at_risk) ? "warn" : "default"}
        />
        <KpiCard
          label="Stock value"
          value={formatKesCompact(dashboard.stock_value_total)}
          hint={`${dashboard.wastage_percent_this_month}% wastage this month`}
        />
      </div>

      <div className="inv-toolbar dash-panel">
        <input
          className="inv-toolbar__search"
          placeholder="Search name or SKU…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select className="inv-select" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">All sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="inv-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {MATERIAL_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="inv-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STOCK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Loading inventory…" />
        </div>
      ) : null}
      {error ? <p className="inv-form-error">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="dash-empty">
                <p className="dash-empty__title">No materials yet</p>
                <p className="dash-empty__text">
                  Add materials to a site store, set reorder levels, then record stock in and out.
                </p>
                {canManage ? (
                  <button type="button" className="dash-empty__link" onClick={() => setFormOpen(true)}>
                    Add material
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="dash-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Site</th>
                        <th>On hand</th>
                        <th>Reorder</th>
                        <th>Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <Link href={`/dashboard/inventory/${item.id}`} className="inv-table__link">
                              <span className="font-medium text-[var(--navy)]">{item.name}</span>
                              <span className="block text-xs text-[var(--gray-500)]">
                                {materialCategoryLabel(item.category)}
                                {item.sku ? ` · ${item.sku}` : ""}
                              </span>
                            </Link>
                          </td>
                          <td className="text-sm text-[var(--gray-600)]">{item.site_name}</td>
                          <td className="font-medium text-[var(--navy)]">
                            {item.quantity_on_hand} {item.unit}
                          </td>
                          <td className="text-sm text-[var(--gray-600)]">
                            {item.reorder_level} {item.unit}
                          </td>
                          <td className="font-medium">{formatKesCompact(item.stock_value)}</td>
                          <td>
                            <StockStatusBadge status={item.stock_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="dash-panel p-4">
              <h2 className="dash-panel__title">Alerts</h2>
              {dashboard.low_stock_items.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--gray-500)]">No low-stock or at-risk items.</p>
              ) : (
                <ul className="inv-alert-list mt-3">
                  {dashboard.low_stock_items.slice(0, 6).map((alert) => (
                    <li key={alert.id}>
                      <Link href={`/dashboard/inventory/${alert.id}`}>
                        <span className="font-medium text-[var(--navy)]">{alert.name}</span>
                        <span className="block text-xs text-[var(--gray-500)]">
                          {alert.quantity_on_hand}/{alert.reorder_level} {alert.unit} · {alert.site_name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dash-panel p-4">
              <h2 className="dash-panel__title">Recent movements</h2>
              {dashboard.recent_movements.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--gray-500)]">No movements yet.</p>
              ) : (
                <ul className="inv-activity mt-3">
                  {dashboard.recent_movements.slice(0, 8).map((m) => (
                    <li key={m.id}>
                      <p className="font-medium text-[var(--navy)]">{m.item_name}</p>
                      <p className="text-xs text-[var(--gray-500)]">
                        {movementTypeLabel(m.movement_type)} · {m.quantity} {m.unit}
                        {m.performed_by ? ` · ${m.performed_by}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {dashboard.category_breakdown.length ? (
              <section className="dash-panel p-4">
                <h2 className="dash-panel__title">Value by category</h2>
                <ul className="mt-3 space-y-2">
                  {dashboard.category_breakdown.slice(0, 5).map((row) => (
                    <li key={row.category} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--gray-600)]">{materialCategoryLabel(row.category)}</span>
                      <span className="font-medium text-[var(--navy)]">
                        {formatKesCompact(row.value)} · {row.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      ) : null}

      <InventoryItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        defaultSiteId={siteId}
      />
    </div>
  );
}
