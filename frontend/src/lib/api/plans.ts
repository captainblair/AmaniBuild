import { apiDataRequest, ApiClientError } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/api/config";
import type { Company, SubscriptionPlan, SubscriptionPlansResponse } from "@/lib/api/types";

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    code: "free",
    name: "Free",
    description: "1 project, basic attendance & diary, limited users.",
    price_kes_monthly: "0.00",
    max_projects: 1,
    max_users: 5,
    max_storage_gb: 2,
  },
  {
    code: "starter",
    name: "Starter",
    description: "Multiple projects, inventory, basic reports.",
    price_kes_monthly: "3500.00",
    max_projects: 5,
    max_users: 15,
    max_storage_gb: 10,
  },
  {
    code: "professional",
    name: "Professional",
    description: "Full modules, advanced analytics, API access.",
    price_kes_monthly: "8500.00",
    max_projects: 25,
    max_users: 999,
    max_storage_gb: 100,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Custom volume, white-label, dedicated support.",
    price_kes_monthly: "0.00",
    max_projects: 999,
    max_users: 999,
    max_storage_gb: 500,
  },
];

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/plans/`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) return FALLBACK_PLANS;

    const payload = (await response.json()) as { success?: boolean; data?: SubscriptionPlansResponse };
    return payload.data?.plans?.length ? payload.data.plans : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

/** Authenticated plans fetch for dashboard upgrade UI. */
export async function fetchPlansForUpgrade(): Promise<SubscriptionPlan[]> {
  try {
    const data = await apiDataRequest<{ plans: SubscriptionPlan[] }>("/plans/", {
      method: "GET",
      auth: false,
      company: false,
    });
    return data.plans?.length ? data.plans : FALLBACK_PLANS;
  } catch {
    return fetchSubscriptionPlans();
  }
}

export async function changeCompanyPlan(planCode: string): Promise<{ message: string; company: Company }> {
  return apiDataRequest("/company/plan/", {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });
}

export function formatPlanPrice(plan: SubscriptionPlan): string {
  if (plan.code === "enterprise") return "Custom";
  const amount = Number(plan.price_kes_monthly);
  if (amount === 0) return "Free";
  return `KSh ${amount.toLocaleString("en-KE")}/mo`;
}

export function isPlanLimitError(err: unknown): err is ApiClientError {
  return (
    err instanceof ApiClientError &&
    (err.code === "plan_project_limit" || err.code === "plan_user_limit")
  );
}

export function upgradeHref(options?: {
  reason?: string;
  next?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.reason) params.set("reason", options.reason);
  if (options?.next) params.set("next", options.next);
  const qs = params.toString();
  return qs ? `/dashboard/settings/billing?${qs}` : "/dashboard/settings/billing";
}
