"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PurchaseRequestFormModal } from "@/components/procurement/PurchaseRequestFormModal";
import { PurchaseStatusBadge } from "@/components/procurement/PurchaseStatusBadge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchPurchaseRequests } from "@/lib/api/procurement";
import { fetchProjects } from "@/lib/api/projects";
import type {
  ProjectListItem,
  PurchaseRequest,
  PurchaseRequestListItem,
  PurchaseRequestStatusCounts,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import {
  purchaseCategoryLabel,
  PURCHASE_CATEGORIES,
  PURCHASE_STATUSES,
} from "@/lib/procurement/labels";

const emptyCounts: PurchaseRequestStatusCounts = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

export function ProcurementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_procurement");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [items, setItems] = useState<PurchaseRequestListItem[]>([]);
  const [counts, setCounts] = useState<PurchaseRequestStatusCounts>(emptyCounts);
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        const fromQuery = searchParams.get("project");
        if (fromQuery && data.results.some((p) => p.id === fromQuery)) {
          setProjectId(fromQuery);
        }
      })
      .catch(() => setProjects([]));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage) {
      setFormOpen(true);
      router.replace(
        projectId ? `/dashboard/procurement?project=${projectId}` : "/dashboard/procurement",
      );
    }
  }, [searchParams, canManage, projectId, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPurchaseRequests({
        page_size: 50,
        project_id: projectId || undefined,
        status: status || undefined,
        category: category || undefined,
        search: search.trim() || undefined,
      });
      setItems(data.results);
      setCounts(data.status_counts ?? emptyCounts);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load purchase requests.");
    } finally {
      setLoading(false);
    }
  }, [projectId, status, category, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSaved(request: PurchaseRequest) {
    router.push(`/dashboard/procurement/${request.id}`);
  }

  return (
    <div className="proc-page space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--gray-500)]">Procurement</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            Purchase requests
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            Draft, submit, and approve site purchases with a clear approval trail.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            + New request
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="All requests" value={counts.all} />
        <KpiCard label="Pending approval" value={counts.pending} tone={counts.pending ? "warn" : "default"} />
        <KpiCard label="Approved" value={counts.approved} tone="success" />
        <KpiCard label="Rejected" value={counts.rejected} tone={counts.rejected ? "danger" : "default"} />
      </div>

      <div className="proc-toolbar dash-panel">
        <input
          className="proc-toolbar__search"
          placeholder="Search title or PO number…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select className="proc-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="proc-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PURCHASE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select className="proc-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {PURCHASE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Loading purchase requests…" />
        </div>
      ) : null}
      {error ? <p className="proc-form-error">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty__title">No purchase requests yet</p>
          <p className="dash-empty__text">
            Create a draft request with line items, then submit it for manager and owner approval.
          </p>
          {canManage ? (
            <button type="button" className="dash-empty__link" onClick={() => setFormOpen(true)}>
              Create request
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="dash-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="proc-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Requested by</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/dashboard/procurement/${item.id}`} className="proc-table__link">
                        <span className="font-medium text-[var(--navy)]">{item.title}</span>
                        <span className="block text-xs text-[var(--gray-500)]">{item.request_number}</span>
                      </Link>
                    </td>
                    <td className="text-sm text-[var(--gray-600)]">{item.project_name}</td>
                    <td className="text-sm text-[var(--gray-600)]">
                      {purchaseCategoryLabel(item.category)}
                    </td>
                    <td className="font-medium text-[var(--navy)]">
                      {formatKesCompact(item.total_amount)}
                    </td>
                    <td>
                      <PurchaseStatusBadge status={item.status} />
                    </td>
                    <td className="text-sm text-[var(--gray-600)]">
                      {item.requested_by_name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <PurchaseRequestFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        defaultProjectId={projectId}
      />
    </div>
  );
}
