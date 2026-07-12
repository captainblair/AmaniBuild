import { Suspense } from "react";
import { DocumentsPage } from "@/components/documents/DocumentsPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/documents.css";

export const metadata = { title: "Documents" };

export default function DocumentsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading documents…" />
        </div>
      }
    >
      <DocumentsPage />
    </Suspense>
  );
}
