"use client";

import { IconBell, IconMenu, IconSearch } from "@/components/layout/NavIcons";
import { Button } from "@/components/ui/Button";
import { useDashboardSession } from "@/lib/auth/session";
import { roleLabel } from "@/lib/nav/roles";

type TopBarProps = {
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
  title?: string;
  subtitle?: string;
};

export function TopBar({ onToggleSidebar, onOpenMobile, title, subtitle }: TopBarProps) {
  const { user, membership } = useDashboardSession();
  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "AB";
  const canManageProjects = membership.permissions.includes("manage_projects");
  const canManageDiary = membership.permissions.includes("manage_diary");

  return (
    <header className="dash-topbar">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--navy)] hover:bg-[var(--gray-100)] lg:hidden"
          onClick={onOpenMobile}
          aria-label="Open menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="hidden h-9 w-9 place-items-center rounded-lg text-[var(--gray-500)] hover:bg-[var(--gray-100)] lg:grid"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          {title ? (
            <>
              <h1
                className="truncate text-lg font-extrabold text-[var(--navy)] md:text-xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h1>
              {subtitle ? <p className="truncate text-xs text-[var(--gray-500)]">{subtitle}</p> : null}
            </>
          ) : (
            <div className="relative hidden max-w-md md:block">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
              <input
                type="search"
                placeholder="Search projects, tasks, people…"
                className="w-full rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)] focus:bg-white"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          {canManageProjects ? (
            <Button href="/dashboard/projects" size="sm" className="!py-2">
              + New Project
            </Button>
          ) : null}
          {canManageDiary ? (
            <Button href="/dashboard/diary" variant="outline" size="sm" className="!py-2">
              + Daily Report
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-lg text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
          aria-label="Notifications"
        >
          <IconBell className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 border-l border-[var(--gray-200)] pl-3 sm:flex">
          <div className="text-right">
            <p className="text-xs font-semibold text-[var(--navy)]">{user.full_name}</p>
            <p className="text-[10px] text-[var(--gray-500)]">{roleLabel(membership.role)}</p>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
