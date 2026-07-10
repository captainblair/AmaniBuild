"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { NAV_ICONS } from "@/components/layout/NavIcons";
import { filterNavGroups, NAV_GROUPS, type NavGroup } from "@/lib/nav/config";
import { roleLabel } from "@/lib/nav/roles";
import { useDashboardSession } from "@/lib/auth/session";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  groups,
  collapsed,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {groups.map((group) => (
        <div key={group.id} className="mb-4">
          {!collapsed ? (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = NAV_ICONS[item.id] ?? NAV_ICONS.dashboard;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-white/10 text-[var(--orange)]"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    } ${collapsed ? "justify-center px-2" : ""}`}
                  >
                    {active ? (
                      <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-[var(--orange)]" />
                    ) : null}
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed ? <span className="truncate font-medium">{item.label}</span> : null}
                    {!collapsed && item.badge ? (
                      <span className="ml-auto rounded-full bg-[var(--orange)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--orange-ink)]">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, membership, companies, switchCompany, signOut } = useDashboardSession();
  const navGroups = filterNavGroups(NAV_GROUPS, membership.permissions, membership.role);
  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "AB";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={`dash-sidebar ${collapsed ? "dash-sidebar--collapsed" : ""} ${
          mobileOpen ? "dash-sidebar--mobile-open" : ""
        }`}
      >
        <div
          className={`flex items-center border-b border-white/10 ${
            collapsed ? "justify-center px-2 py-3" : "px-3 py-3"
          }`}
        >
          {collapsed ? (
            <LogoMark onDark size="md" className="!h-11 !w-11" />
          ) : (
          <Logo href="/dashboard" variant="light" size="xl" className="!px-3 !py-2" />
          )}
        </div>

        {!collapsed && companies.length > 1 ? (
          <div className="border-b border-white/10 px-3 py-3">
            <label className="sr-only" htmlFor="company-switcher">
              Company
            </label>
            <select
              id="company-switcher"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none"
              value={membership.company_id}
              onChange={(e) => switchCompany(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id} className="text-[var(--navy)]">
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {!collapsed ? (
          <div className="border-b border-white/10 px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--orange)] text-xs font-bold text-[var(--orange-ink)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.full_name}</p>
                <p className="truncate text-[11px] text-white/45">{roleLabel(membership.role)}</p>
              </div>
            </div>
            {companies.length === 1 ? (
              <p className="mt-2 truncate px-1 text-[11px] text-white/40">{membership.company_name}</p>
            ) : null}
          </div>
        ) : null}

        <NavList
          groups={navGroups}
          collapsed={collapsed}
          pathname={pathname}
          onNavigate={onCloseMobile}
        />

        <div className={`mt-auto border-t border-white/10 ${collapsed ? "p-2" : "p-3"}`}>
          {!collapsed ? (
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="grid w-full place-items-center rounded-lg py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"
            >
              Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
