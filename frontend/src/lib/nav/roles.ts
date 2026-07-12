import type { CompanyRole } from "@/lib/api/types";

export const ROLE_LABELS: Record<string, string> = {
  owner: "Company Owner",
  project_manager: "Project Manager",
  site_engineer: "Site Engineer",
  foreman: "Site Foreman",
  accountant: "Accountant",
  store_keeper: "Store Keeper",
  worker: "Worker",
  client: "Client",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replaceAll("_", " ");
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string, fallback = "there"): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fallback;
}

export type DashboardVariant =
  | "owner"
  | "project_manager"
  | "site_engineer"
  | "foreman"
  | "worker"
  | "default";

export function dashboardVariantForRole(role: string): DashboardVariant {
  if (role === "owner" || role === "accountant") return "owner";
  if (role === "project_manager") return "project_manager";
  if (role === "site_engineer") return "site_engineer";
  if (role === "foreman") return "foreman";
  if (role === "worker") return "worker";
  return "default";
}

export function isCompanyRole(role: string): role is CompanyRole {
  return role in ROLE_LABELS;
}
