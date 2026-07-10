import { getApiBaseUrl } from "@/lib/api/config";
import type { SubscriptionPlan, SubscriptionPlansResponse } from "@/lib/api/types";

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

export function formatPlanPrice(plan: SubscriptionPlan): string {
  if (plan.code === "enterprise") return "Custom";
  const amount = Number(plan.price_kes_monthly);
  if (amount === 0) return "Free";
  return `KSh ${amount.toLocaleString("en-KE")}`;
}
