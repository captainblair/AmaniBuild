import { Suspense } from "react";
import { ExpensesPage } from "@/components/expenses/ExpensesPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/expenses.css";

export const metadata = { title: "Expenses" };

export default function ExpensesRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading expenses…" />
        </div>
      }
    >
      <ExpensesPage />
    </Suspense>
  );
}
