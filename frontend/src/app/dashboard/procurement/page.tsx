import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export const metadata = { title: "Procurement" };

export default function ProcurementPlaceholderPage() {
  return (
    <ModulePlaceholder
      title="Procurement"
      description="Purchase requests and approvals land in a later phase."
    />
  );
}
