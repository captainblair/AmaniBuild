export type NavItem = {
  id: string;
  label: string;
  href: string;
  /** Permission required; omit = visible to all company members (except client portal) */
  permission?: string;
  badge?: number;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Unified IA from Main sidebar nav — filtered by membership permissions. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "primary",
    label: "Primary",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard" },
      { id: "projects", label: "Projects", href: "/dashboard/projects" },
      { id: "diary", label: "Site Diary", href: "/dashboard/diary", permission: "view_diary" },
      { id: "attendance", label: "Attendance", href: "/dashboard/attendance" },
      { id: "tasks", label: "Tasks", href: "/dashboard/tasks", permission: "view_tasks" },
      { id: "documents", label: "Documents", href: "/dashboard/documents", permission: "view_documents" },
      { id: "messages", label: "Messages", href: "/dashboard/messages", permission: "view_messaging" },
      { id: "inspections", label: "Inspections", href: "/dashboard/inspections", permission: "view_inspections" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { id: "procurement", label: "Procurement", href: "/dashboard/procurement", permission: "view_procurement" },
      { id: "inventory", label: "Inventory", href: "/dashboard/inventory", permission: "view_inventory" },
      { id: "equipment", label: "Equipment", href: "/dashboard/equipment", permission: "view_schedule" },
      { id: "workforce", label: "Workforce", href: "/dashboard/workforce", permission: "view_team" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { id: "reports", label: "Reports", href: "/dashboard/reports", permission: "view_reports" },
      { id: "notifications", label: "Notifications", href: "/dashboard/notifications", permission: "view_notifications" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { id: "settings", label: "Settings", href: "/dashboard/settings" },
      { id: "users", label: "User Management", href: "/dashboard/users", permission: "manage_team" },
      { id: "help", label: "Help & Support", href: "/dashboard/help" },
    ],
  },
];

export type MobileTab = {
  id: string;
  label: string;
  href: string;
};

const MOBILE_BY_ROLE: Record<string, MobileTab[]> = {
  owner: [
    { id: "home", label: "Overview", href: "/dashboard" },
    { id: "projects", label: "Projects", href: "/dashboard/projects" },
    { id: "workforce", label: "Teams", href: "/dashboard/workforce" },
    { id: "reports", label: "Reports", href: "/dashboard/reports" },
    { id: "more", label: "More", href: "/dashboard/more" },
  ],
  project_manager: [
    { id: "home", label: "Overview", href: "/dashboard" },
    { id: "projects", label: "Projects", href: "/dashboard/projects" },
    { id: "tasks", label: "Tasks", href: "/dashboard/tasks" },
    { id: "diary", label: "Diary", href: "/dashboard/diary" },
    { id: "more", label: "More", href: "/dashboard/more" },
  ],
  site_engineer: [
    { id: "home", label: "Home", href: "/dashboard" },
    { id: "tasks", label: "Tasks", href: "/dashboard/tasks" },
    { id: "diary", label: "Diary", href: "/dashboard/diary" },
    { id: "inspections", label: "QA", href: "/dashboard/inspections" },
    { id: "more", label: "More", href: "/dashboard/more" },
  ],
  foreman: [
    { id: "home", label: "Home", href: "/dashboard" },
    { id: "attendance", label: "Attendance", href: "/dashboard/attendance" },
    { id: "tasks", label: "Tasks", href: "/dashboard/tasks" },
    { id: "inspections", label: "Issues", href: "/dashboard/inspections" },
    { id: "more", label: "More", href: "/dashboard/more" },
  ],
  worker: [
    { id: "home", label: "Home", href: "/dashboard" },
    { id: "attendance", label: "Clock", href: "/dashboard/attendance" },
    { id: "tasks", label: "Tasks", href: "/dashboard/tasks" },
    { id: "diary", label: "Diary", href: "/dashboard/diary" },
    { id: "more", label: "More", href: "/dashboard/more" },
  ],
};

const DEFAULT_MOBILE: MobileTab[] = [
  { id: "home", label: "Home", href: "/dashboard" },
  { id: "projects", label: "Projects", href: "/dashboard/projects" },
  { id: "tasks", label: "Tasks", href: "/dashboard/tasks" },
  { id: "diary", label: "Diary", href: "/dashboard/diary" },
  { id: "more", label: "More", href: "/dashboard/more" },
];

export function mobileTabsForRole(role: string): MobileTab[] {
  return MOBILE_BY_ROLE[role] ?? DEFAULT_MOBILE;
}

export function filterNavGroups(groups: NavGroup[], permissions: string[], role: string): NavGroup[] {
  if (role === "client") {
    return [
      {
        id: "primary",
        label: "Primary",
        items: [
          { id: "dashboard", label: "Portal", href: "/dashboard" },
          { id: "help", label: "Help & Support", href: "/dashboard/help" },
        ],
      },
    ];
  }

  const permSet = new Set(permissions);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || permSet.has(item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}
