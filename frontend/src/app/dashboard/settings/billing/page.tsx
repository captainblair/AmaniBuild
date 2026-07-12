import { Suspense } from "react";
import { BillingUpgradePage } from "@/components/billing/BillingUpgradePage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/admin.css";

export const metadata = { title: "Upgrade plan" };

export default function BillingRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading billing…" />
        </div>
      }
    >
      <BillingUpgradePage />
    </Suspense>
  );
}
