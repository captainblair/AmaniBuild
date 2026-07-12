import { Suspense } from "react";
import { ProcurementPage } from "@/components/procurement/ProcurementPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/procurement.css";

export const metadata = { title: "Procurement" };

export default function ProcurementRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading procurement…" />
        </div>
      }
    >
      <ProcurementPage />
    </Suspense>
  );
}
