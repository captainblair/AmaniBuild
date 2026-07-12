import { Suspense } from "react";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/notifications.css";

export const metadata = { title: "Notifications" };

export default function NotificationsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading notifications…" />
        </div>
      }
    >
      <NotificationsPage />
    </Suspense>
  );
}
