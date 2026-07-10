"use client";

import Link from "next/link";
import { useDashboardSession } from "@/lib/auth/session";
import { filterNavGroups, NAV_GROUPS } from "@/lib/nav/config";
import { NAV_ICONS } from "@/components/layout/NavIcons";

export default function MorePage() {
  const { membership } = useDashboardSession();
  const groups = filterNavGroups(NAV_GROUPS, membership.permissions, membership.role);

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1
          className="text-2xl font-extrabold text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          More
        </h1>
        <p className="mt-1 text-sm text-[var(--gray-500)]">All modules available to your role.</p>
      </div>
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
            {group.label}
          </h2>
          <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white">
            {group.items.map((item) => {
              const Icon = NAV_ICONS[item.id] ?? NAV_ICONS.dashboard;
              return (
                <li key={item.id} className="border-t border-[var(--gray-100)] first:border-t-0">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--navy)] hover:bg-[var(--gray-50)]"
                  >
                    <Icon className="h-5 w-5 text-[var(--gray-500)]" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
