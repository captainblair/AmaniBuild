"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  approveExpense,
  fetchExpense,
  reimburseExpense,
  rejectExpense,
  submitExpense,
} from "@/lib/api/expenses";
import type { Expense } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import {
  expenseCategoryLabel,
  expenseStatusLabel,
  expenseStatusTone,
  formatExpenseDate,
  paymentMethodLabel,
  receiptUrl,
} from "@/lib/expenses/labels";

type Props = {
  expenseId: string;
};

export function ExpenseDetailPage({ expenseId }: Props) {
  const { membership } = useDashboardSession();
  const canView = membership.permissions.includes("view_expenses");
  const canManage = membership.permissions.includes("manage_expenses");
  const canApprove = membership.permissions.includes("approve_expenses");

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view expenses.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setExpense(await fetchExpense(expenseId));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load expense.");
    } finally {
      setLoading(false);
    }
  }, [canView, expenseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<Expense>) {
    setBusy(true);
    setError(null);
    try {
      setExpense(await action());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading expense…" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">{error || "Expense not found."}</p>
        <Link href="/dashboard/expenses" className="exp-link mt-3 inline-block">
          Back to expenses
        </Link>
      </div>
    );
  }

  const editable = canManage && ["draft", "rejected"].includes(expense.status);

  return (
    <div className="exp-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/expenses" className="exp-back">
            ← Expenses
          </Link>
          <p className="exp-detail__number">{expense.expense_number}</p>
          <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            {expense.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            {expense.project_name} · {expenseCategoryLabel(expense.category)}
          </p>
        </div>
        <span className={`exp-badge exp-badge--${expenseStatusTone(expense.status)}`}>
          {expenseStatusLabel(expense.status)}
        </span>
      </div>

      {error ? <p className="exp-error">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="exp-meta-card">
          <span>Total</span>
          <strong>{formatKesCompact(expense.total_amount)}</strong>
        </div>
        <div className="exp-meta-card">
          <span>Date</span>
          <strong>{formatExpenseDate(expense.expense_date)}</strong>
        </div>
        <div className="exp-meta-card">
          <span>Payment</span>
          <strong>{paymentMethodLabel(expense.payment_method)}</strong>
        </div>
        <div className="exp-meta-card">
          <span>Vendor</span>
          <strong>{expense.vendor_name || "—"}</strong>
        </div>
      </div>

      <div className="exp-actions">
        {editable ? (
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        ) : null}
        {canManage && ["draft", "rejected"].includes(expense.status) ? (
          <Button type="button" disabled={busy} onClick={() => void run(() => submitExpense(expense.id))}>
            Submit for approval
          </Button>
        ) : null}
        {canApprove && expense.status === "submitted" ? (
          <>
            <Button type="button" disabled={busy} onClick={() => void run(() => approveExpense(expense.id))}>
              Approve
            </Button>
            <div className="exp-reject">
              <input
                className="exp-input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason"
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => rejectExpense(expense.id, rejectReason.trim()))}
              >
                Reject
              </Button>
            </div>
          </>
        ) : null}
        {canApprove && expense.status === "approved" ? (
          <Button type="button" disabled={busy} onClick={() => void run(() => reimburseExpense(expense.id))}>
            Mark reimbursed
          </Button>
        ) : null}
      </div>

      {(expense.description || expense.notes || expense.reference_number) && (
        <div className="dash-panel p-4 space-y-3">
          {expense.description ? (
            <div>
              <h2 className="exp-section-title">Description</h2>
              <p className="text-sm text-[var(--gray-600)]">{expense.description}</p>
            </div>
          ) : null}
          {expense.notes ? (
            <div>
              <h2 className="exp-section-title">Notes</h2>
              <p className="text-sm text-[var(--gray-600)]">{expense.notes}</p>
            </div>
          ) : null}
          {expense.reference_number ? (
            <p className="text-sm text-[var(--gray-500)]">Reference: {expense.reference_number}</p>
          ) : null}
          {expense.rejection_reason ? (
            <p className="text-sm text-[var(--red)]">Rejected: {expense.rejection_reason}</p>
          ) : null}
        </div>
      )}

      <div className="dash-panel p-4">
        <h2 className="exp-section-title">Receipts ({expense.receipt_count})</h2>
        {expense.receipt_photos?.length ? (
          <ul className="exp-receipt-grid">
            {expense.receipt_photos.map((photo, index) => {
              const href = receiptUrl(photo);
              return (
                <li key={`${href}-${index}`}>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer">
                      {photo.filename || photo.name || `Receipt ${index + 1}`}
                    </a>
                  ) : (
                    <span>{photo.filename || `Receipt ${index + 1}`}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[var(--gray-500)]">
            No receipts attached. Add at least one before submitting.
          </p>
        )}
      </div>

      <div className="dash-panel p-4 text-sm text-[var(--gray-500)]">
        Recorded by {expense.recorded_by_name || "—"}
        {expense.approved_by_name ? ` · Approved by ${expense.approved_by_name}` : ""}
        {expense.amount ? ` · Amount ${formatKesCompact(expense.amount)} + tax ${formatKesCompact(expense.tax_amount)}` : ""}
      </div>

      <ExpenseFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => {
          setExpense(next);
          setEditOpen(false);
        }}
        initial={expense}
      />
    </div>
  );
}
