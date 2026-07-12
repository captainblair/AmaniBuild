import { Suspense } from "react";
import { InventoryPage } from "@/components/inventory/InventoryPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/inventory.css";

export const metadata = { title: "Inventory" };

export default function InventoryRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading inventory…" />
        </div>
      }
    >
      <InventoryPage />
    </Suspense>
  );
}
