"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dash-app">
      <Sidebar
        collapsed={false}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="dash-main">
        <TopBar
          onOpenMobile={() => setMobileOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        <main className="dash-content">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
