import { stockStatusLabel } from "@/lib/inventory/labels";

const toneClass = (status: string) => {
  if (status === "on_track") return "inv-badge inv-badge--good";
  if (status === "at_risk") return "inv-badge inv-badge--warn";
  if (status === "low_stock") return "inv-badge inv-badge--danger";
  return "inv-badge inv-badge--muted";
};

export function StockStatusBadge({ status }: { status: string }) {
  return <span className={toneClass(status)}>{stockStatusLabel(status)}</span>;
}
