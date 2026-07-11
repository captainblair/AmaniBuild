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
    <nav className="flex-1 overflow-y-auto py-3">
      {groups.map((group) => (
        <div key={group.id} className="mb-4">
          {!collapsed ? <p className="dash-nav-group-label">{group.label}</p> : null}
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
                    className={`dash-nav-link${active ? " is-active" : ""}${collapsed ? " justify-center px-2" : ""}`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {!collapsed && item.badge ? (
                      <span className="ml-auto bg-[var(--orange)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--orange-ink)]">
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
          className="fixed inset-0 z-40 bg-black/55 lg:hidden"
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
          className={`dash-sidebar__brand ${
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
              className="w-full border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none"
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
          <div className="dash-sidebar__user">
            <div className="dash-sidebar__user-card">
              <div className="dash-sidebar__avatar">{initials}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.full_name}</p>
                <p className="truncate text-[11px] text-white/45">{roleLabel(membership.role)}</p>
              </div>
            </div>
            {companies.length === 1 ? (
              <p className="dash-sidebar__company">
                {membership.company_name}
                <span>Primary</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <NavList
          groups={navGroups}
          collapsed={collapsed}
          pathname={pathname}
          onNavigate={onCloseMobile}
        />

        <div className={`dash-sidebar__foot ${collapsed ? "!p-2" : ""}`}>
          {!collapsed ? (
            <button type="button" onClick={signOut} className="dash-sidebar__signout">
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="grid w-full place-items-center py-2 text-xs text-white/50 hover:text-white"
            >
              Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
