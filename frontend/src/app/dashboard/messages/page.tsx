import { Suspense } from "react";
import { MessagingPage } from "@/components/messaging/MessagingPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/messaging.css";

export const metadata = { title: "Messages" };

export default function MessagesRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading messages…" />
        </div>
      }
    >
      <MessagingPage />
    </Suspense>
  );
}
