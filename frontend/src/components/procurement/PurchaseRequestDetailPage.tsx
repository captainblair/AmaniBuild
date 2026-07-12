"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PurchaseRequestFormModal } from "@/components/procurement/PurchaseRequestFormModal";
import { PurchaseStatusBadge } from "@/components/procurement/PurchaseStatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  approvePurchaseRequest,
  deletePurchaseRequest,
  fetchPurchaseRequest,
  fetchPurchaseRequestActivity,
  rejectPurchaseRequest,
  submitPurchaseRequest,
} from "@/lib/api/procurement";
import type { PurchaseRequest, PurchaseRequestActivityItem } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import {
  isPendingPurchaseStatus,
  purchaseCategoryLabel,
  purchaseStepLabel,
} from "@/lib/procurement/labels";

type Props = { requestId: string };

export function PurchaseRequestDetailPage({ requestId }: Props) {
  const router = useRouter();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_procurement");
  const canApprove = membership.permissions.includes("approve_procurement");
  const isOwner = membership.role === "owner";
  const isPmOrOwner = isOwner || membership.role === "project_manager";

  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [activity, setActivity] = useState<PurchaseRequestActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, timeline] = await Promise.all([
        fetchPurchaseRequest(requestId),
        fetchPurchaseRequestActivity(requestId),
      ]);
      setRequest(detail);
      setActivity(timeline);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load purchase request.");
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: "submit" | "approve" | "delete") {
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "delete") {
        if (!window.confirm("Delete this draft purchase request?")) {
          setBusy(false);
          return;
        }
        await deletePurchaseRequest(request.id);
        router.push("/dashboard/procurement");
        return;
      }
      const next =
        action === "submit"
          ? await submitPurchaseRequest(request.id)
          : await approvePurchaseRequest(request.id);
      setRequest(next);
      setActivity(await fetchPurchaseRequestActivity(request.id));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!request || !rejectReason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await rejectPurchaseRequest(request.id, rejectReason.trim());
      setRequest(next);
      setShowReject(false);
      setRejectReason("");
      setActivity(await fetchPurchaseRequestActivity(request.id));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not reject request.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading request…" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="dash-panel mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-[var(--red)]">{error ?? "Request not found."}</p>
        <Button href="/dashboard/procurement" className="mt-4" variant="outline">
          Back to procurement
        </Button>
      </div>
    );
  }

  const isDraft = request.status === "draft";
  const canManagerApprove = canApprove && isPmOrOwner && request.status === "pending_manager";
  const canOwnerApprove = canApprove && isOwner && request.status === "pending_owner";
  const showApprove = canManagerApprove || canOwnerApprove;

  return (
    <div className="proc-detail space-y-5">
      <div className="proc-detail__crumb">
        <Link href="/dashboard/procurement">Procurement</Link>
        <span>/</span>
        <span>{request.request_number}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PurchaseStatusBadge status={request.status} />
            <span className="text-sm text-[var(--gray-500)]">
              {purchaseCategoryLabel(request.category)}
            </span>
          </div>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            {request.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            {request.request_number} · {request.project_name} ·{" "}
            {formatKesCompact(request.total_amount)} {request.currency}
          </p>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            Requested by {request.requested_by_name || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && isDraft ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void runAction("delete")}
              >
                Delete
              </Button>
              <Button type="button" size="sm" disabled={busy} onClick={() => void runAction("submit")}>
                Submit for approval
              </Button>
            </>
          ) : null}
          {showApprove ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setShowReject(true)}
              >
                Reject
              </Button>
              <Button type="button" size="sm" disabled={busy} onClick={() => void runAction("approve")}>
                {request.status === "pending_manager" ? "Approve (manager)" : "Final approve"}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {error ? <p className="proc-form-error">{error}</p> : null}

      {showReject ? (
        <section className="dash-panel p-4 space-y-3">
          <h2 className="dash-panel__title">Reject request</h2>
          <textarea
            className="proc-textarea"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void onReject()}>
              Confirm reject
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
        <section className="dash-panel p-5 space-y-4">
          <h2 className="dash-panel__title">Line items</h2>
          <div className="overflow-x-auto">
            <table className="proc-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {request.lines.map((line, index) => (
                  <tr key={line.id ?? index}>
                    <td className="font-medium text-[var(--navy)]">{line.description}</td>
                    <td>{line.quantity}</td>
                    <td>{line.unit}</td>
                    <td>{formatKesCompact(line.unit_price)}</td>
                    <td className="font-medium">{formatKesCompact(line.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-right text-sm font-semibold text-[var(--navy)]">
            Total {formatKesCompact(request.total_amount)} {request.currency}
          </p>
          {request.justification ? (
            <div>
              <h3 className="text-sm font-medium text-[var(--navy)]">Justification</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--gray-600)]">
                {request.justification}
              </p>
            </div>
          ) : null}
          {request.rejection_reason ? (
            <div className="proc-form-error">
              Rejected: {request.rejection_reason}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Approval steps</h2>
            <ol className="proc-steps mt-3">
              {(request.approval_steps.length
                ? request.approval_steps
                : [
                    { step_type: "submitted", status: isDraft ? "pending" : "completed", acted_by_name: null, acted_at: null, notes: "" },
                    { step_type: "manager_review", status: "pending", acted_by_name: null, acted_at: null, notes: "" },
                    { step_type: "owner_approval", status: "pending", acted_by_name: null, acted_at: null, notes: "" },
                  ]
              ).map((step) => (
                <li
                  key={step.step_type}
                  className={`proc-steps__item${step.status === "completed" ? " is-done" : ""}${
                    step.status === "rejected" ? " is-rejected" : ""
                  }${step.status === "pending" && isPendingPurchaseStatus(request.status) ? " is-current" : ""}`}
                >
                  <p className="font-medium text-[var(--navy)]">{purchaseStepLabel(step.step_type)}</p>
                  <p className="text-xs text-[var(--gray-500)] capitalize">{step.status.replace(/_/g, " ")}</p>
                  {step.acted_by_name ? (
                    <p className="text-xs text-[var(--gray-500)]">{step.acted_by_name}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Activity</h2>
            {activity.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--gray-500)]">No activity yet.</p>
            ) : (
              <ul className="proc-activity mt-3">
                {activity.map((item, index) => (
                  <li key={`${item.action}-${item.timestamp}-${index}`}>
                    <p className="font-medium capitalize text-[var(--navy)]">
                      {String(item.action ?? "").replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-[var(--gray-500)]">
                      {item.actor ? `${item.actor} · ` : ""}
                      {item.timestamp
                        ? new Date(String(item.timestamp)).toLocaleString("en-KE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                    {item.notes ? (
                      <p className="mt-1 text-sm text-[var(--gray-600)]">{String(item.notes)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <PurchaseRequestFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setRequest(saved);
          void load();
        }}
        initial={request}
      />
    </div>
  );
}
