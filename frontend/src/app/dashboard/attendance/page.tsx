import { Suspense } from "react";
import { AttendancePage } from "@/components/attendance/AttendancePage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/attendance.css";

export const metadata = { title: "Attendance" };

export default function AttendanceRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading attendance…" />
        </div>
      }
    >
      <AttendancePage />
    </Suspense>
  );
}
