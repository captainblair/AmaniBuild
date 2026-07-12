"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchExpenseDashboard, fetchExpenses } from "@/lib/api/expenses";
import { fetchProjects } from "@/lib/api/projects";
import type { Expense, ExpenseDashboard, ExpenseListItem, ProjectListItem } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  expenseCategoryLabel,
  expenseStatusLabel,
  expenseStatusTone,
  formatExpenseDate,
} from "@/lib/expenses/labels";

const emptyDashboard: ExpenseDashboard = {
  total_expenses: 0,
  by_status: { draft: 0, submitted: 0, approved: 0, rejected: 0, reimbursed: 0 },
  total_amount: "0",
  approved_amount: "0",
  pending_approval_amount: "0",
  by_category: [],
};

export function ExpensesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canView = membership.permissions.includes("view_expenses");
  const canManage = membership.permissions.includes("manage_expenses");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [dashboard, setDashboard] = useState<ExpenseDashboard>(emptyDashboard);
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
        if (fromQuery && data.results.some((p) => p.id === fromQuery)) setProjectId(fromQuery);
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
      router.replace(projectId ? `/dashboard/expenses?project=${projectId}` : "/dashboard/expenses");
    }
  }, [searchParams, canManage, projectId, router]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view expenses.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, dash] = await Promise.all([
        fetchExpenses({
          page_size: 50,
          project_id: projectId || undefined,
          status: status || undefined,
          category: category || undefined,
          search: search.trim() || undefined,
        }),
        fetchExpenseDashboard({ project_id: projectId || undefined }),
      ]);
      setItems(list.results);
      setDashboard(dash);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }, [canView, projectId, status, category, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSaved(expense: Expense) {
    router.push(`/dashboard/expenses/${expense.id}`);
  }

  if (!canView) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">You do not have permission to view expenses.</p>
      </div>
    );
  }

  return (
    <div className="exp-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            Expenses
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            Log receipts, track approvals, and reimburse site spend.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            + Log expense
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total amount" value={formatKesCompact(dashboard.total_amount)} />
        <KpiCard
          label="Pending approval"
          value={formatKesCompact(dashboard.pending_approval_amount)}
          hint={`${dashboard.by_status.submitted} submitted`}
          tone={dashboard.by_status.submitted ? "warn" : "default"}
        />
        <KpiCard
          label="Approved"
          value={formatKesCompact(dashboard.approved_amount)}
          hint={`${dashboard.by_status.approved + dashboard.by_status.reimbursed} expenses`}
          tone="success"
        />
        <KpiCard label="All expenses" value={dashboard.total_expenses} />
      </div>

      {error ? <p className="exp-error">{error}</p> : null}

      <div className="exp-toolbar dash-panel">
        <input
          type="search"
          className="exp-toolbar__search"
          placeholder="Search expenses…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select className="exp-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="exp-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="exp-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {EXPENSE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading expenses…" />
        </div>
      ) : items.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty__title">No expenses found</p>
          <p className="dash-empty__text">
            Adjust filters or log a new expense with a receipt.
          </p>
        </div>
      ) : (
        <div className="dash-panel overflow-hidden">
          <div className="exp-table-wrap">
            <table className="exp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense</th>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Receipts</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatExpenseDate(item.expense_date)}</td>
                    <td>
                      <Link href={`/dashboard/expenses/${item.id}`} className="exp-link">
                        <strong>{item.expense_number}</strong>
                        <span>{item.title}</span>
                      </Link>
                    </td>
                    <td>{item.project_name}</td>
                    <td>{expenseCategoryLabel(item.category)}</td>
                    <td>{formatKesCompact(item.total_amount)}</td>
                    <td>{item.receipt_count}</td>
                    <td>
                      <span className={`exp-badge exp-badge--${expenseStatusTone(item.status)}`}>
                        {expenseStatusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dashboard.by_category.length > 0 ? (
        <div className="dash-panel p-4">
          <h2 className="exp-section-title">By category</h2>
          <ul className="exp-category-list">
            {dashboard.by_category.map((row) => (
              <li key={row.category}>
                <strong>{expenseCategoryLabel(row.category)}</strong>
                <span>
                  {row.count} · {formatKesCompact(String(row.amount))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ExpenseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        defaultProjectId={projectId}
      />
    </div>
  );
}
