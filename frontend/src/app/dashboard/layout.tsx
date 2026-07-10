import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardSessionProvider } from "@/lib/auth/session";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardSessionProvider>
      <AppShell>{children}</AppShell>
    </DashboardSessionProvider>
  );
}
