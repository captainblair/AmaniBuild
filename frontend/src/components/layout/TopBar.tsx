"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell, IconMenu, IconSearch } from "@/components/layout/NavIcons";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { fetchNotificationSummary } from "@/lib/api/notifications";
import { useDashboardSession } from "@/lib/auth/session";
import { roleLabel } from "@/lib/nav/roles";

type TopBarProps = {
  onOpenMobile: () => void;
  title?: string;
  subtitle?: string;
};

export function TopBar({ onOpenMobile, title, subtitle }: TopBarProps) {
  const { user, membership } = useDashboardSession();
  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "AB";
  const canManageProjects = membership.permissions.includes("manage_projects");
  const canManageDiary = membership.permissions.includes("manage_diary");
  const canViewNotifications = membership.permissions.includes("view_notifications");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!canViewNotifications) return;
    let cancelled = false;

    const load = () => {
      void fetchNotificationSummary()
        .then((summary) => {
          if (!cancelled) setUnread(summary.unread_total);
        })
        .catch(() => {
          if (!cancelled) setUnread(0);
        });
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [canViewNotifications]);

  return (
    <header className="dash-topbar">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <button
          type="button"
          className="dash-topbar__icon-btn dash-topbar__menu-btn"
          onClick={onOpenMobile}
          aria-label="Open menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <LogoMark onDark size="sm" className="dash-topbar__mark !h-9 !w-9 lg:hidden" />

        <div className="min-w-0 flex-1">
          {title ? (
            <>
              <h1 className="dash-topbar__title">{title}</h1>
              {subtitle ? <p className="dash-topbar__subtitle">{subtitle}</p> : null}
            </>
          ) : (
            <>
              <p className="dash-topbar__brand-name md:hidden">AmaniBuild</p>
              <div className="relative hidden max-w-md md:block">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  type="search"
                  placeholder="Search projects, tasks, people…"
                  className="dash-topbar__search"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          {canManageProjects ? (
            <Button href="/dashboard/projects?new=1" size="sm" className="!py-2">
              + New Project
            </Button>
          ) : null}
          {canManageDiary ? (
            <Button href="/dashboard/diary?new=1" variant="outline" size="sm" className="!py-2">
              + Daily Report
            </Button>
          ) : null}
        </div>

        {canViewNotifications ? (
          <Link
            href="/dashboard/notifications"
            className="dash-topbar__icon-btn relative"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          >
            <IconBell className="h-5 w-5" />
            {unread > 0 ? (
              <span className="dash-topbar__badge">{unread > 99 ? "99+" : unread}</span>
            ) : null}
          </Link>
        ) : (
          <button type="button" className="dash-topbar__icon-btn" aria-label="Notifications" disabled>
            <IconBell className="h-5 w-5" />
          </button>
        )}

        <div className="dash-topbar__user">
          <div className="dash-topbar__user-meta">
            <p className="text-xs font-semibold text-[var(--navy)]">{user.full_name}</p>
            <p className="text-[10px] text-[var(--gray-500)]">{roleLabel(membership.role)}</p>
          </div>
          <div className="dash-topbar__avatar">{initials}</div>
        </div>
      </div>
    </header>
  );
}
