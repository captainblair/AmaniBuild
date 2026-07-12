import { Suspense } from "react";
import { SchedulePage } from "@/components/schedule/SchedulePage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/schedule.css";

export const metadata = { title: "Schedule" };

export default function ScheduleRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading schedule…" />
        </div>
      }
    >
      <SchedulePage />
    </Suspense>
  );
}
