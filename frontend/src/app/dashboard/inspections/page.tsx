import { Suspense } from "react";
import { InspectionsPage } from "@/components/inspections/InspectionsPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/inspections.css";

export const metadata = { title: "Inspections" };

export default function InspectionsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading inspections…" />
        </div>
      }
    >
      <InspectionsPage />
    </Suspense>
  );
}
