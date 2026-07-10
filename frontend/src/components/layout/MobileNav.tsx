"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "@/components/layout/NavIcons";
import { mobileTabsForRole } from "@/lib/nav/config";
import { useDashboardSession } from "@/lib/auth/session";

export function MobileNav() {
  const pathname = usePathname();
  const { membership } = useDashboardSession();
  const tabs = mobileTabsForRole(membership.role);

  return (
    <nav className="dash-mobile-nav" aria-label="Mobile navigation">
      {tabs.map((tab) => {
        const Icon = NAV_ICONS[tab.id] ?? NAV_ICONS.more;
        const active =
          tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              active ? "text-[var(--orange)]" : "text-white/55"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
