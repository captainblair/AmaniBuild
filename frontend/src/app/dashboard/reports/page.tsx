import { Suspense } from "react";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/reports.css";

export const metadata = { title: "Reports" };

export default function ReportsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading reports…" />
        </div>
      }
    >
      <ReportsPage />
    </Suspense>
  );
}
