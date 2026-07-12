import {
  isPendingPurchaseStatus,
  purchaseStatusLabel,
} from "@/lib/procurement/labels";

const toneClass = (status: string) => {
  if (status === "approved") return "proc-badge proc-badge--good";
  if (status === "rejected") return "proc-badge proc-badge--danger";
  if (isPendingPurchaseStatus(status)) return "proc-badge proc-badge--warn";
  return "proc-badge proc-badge--muted";
};

export function PurchaseStatusBadge({ status }: { status: string }) {
  return <span className={toneClass(status)}>{purchaseStatusLabel(status)}</span>;
}
