import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export const metadata = { title: "Inventory" };

export default function InventoryPlaceholderPage() {
  return (
    <ModulePlaceholder
      title="Inventory"
      description="Stock levels and material alerts land in a later phase."
    />
  );
}
