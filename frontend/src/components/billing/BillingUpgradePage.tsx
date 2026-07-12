"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { changeCompanyPlan, fetchPlansForUpgrade, formatPlanPrice } from "@/lib/api/plans";
import { fetchCompany } from "@/lib/api/team";
import type { Company, SubscriptionPlan } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";

const REASON_COPY: Record<string, string> = {
  plan_project_limit: "You hit your project limit. Upgrade to create more projects.",
  plan_user_limit: "You hit your team seat limit. Upgrade to invite more people.",
};

export function BillingUpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const isOwner = membership.role === "owner";
  const reason = searchParams.get("reason") || "";
  const nextPath = searchParams.get("next") || "/dashboard/projects";

  const [company, setCompany] = useState<Company | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [c, p] = await Promise.all([fetchCompany(), fetchPlansForUpgrade()]);
        if (!cancelled) {
          setCompany(c);
          setPlans(p.filter((plan) => plan.code !== "enterprise"));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Could not load billing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [membership.company_id]);

  const currentCode = useMemo(() => {
    if (!company?.plan) return "";
    return typeof company.plan === "string" ? company.plan : company.plan.code;
  }, [company]);

  async function onUpgrade(planCode: string) {
    if (!isOwner) {
      setError("Only the company owner can change the subscription plan.");
      return;
    }
    setBusyCode(planCode);
    setError(null);
    setSuccess(null);
    try {
      const result = await changeCompanyPlan(planCode);
      setCompany(result.company);
      setSuccess(result.message);
      window.setTimeout(() => {
        router.push(nextPath.startsWith("/") ? nextPath : "/dashboard/projects");
      }, 900);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update plan.");
    } finally {
      setBusyCode(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading plans…" />
      </div>
    );
  }

  return (
    <div className="billing-page">
      <header>
        <p className="team-eyebrow">Billing</p>
        <h1 className="team-title">Upgrade your plan</h1>
        <p className="team-sub">
          {REASON_COPY[reason] ||
            `Choose a plan that fits ${membership.company_name}. Payment collection is stubbed for now — upgrades apply immediately for testing.`}
        </p>
      </header>

      {company ? (
        <p className="billing-current">
          Current plan:{" "}
          <strong>
            {typeof company.plan === "string" ? company.plan : company.plan?.name || currentCode}
          </strong>
        </p>
      ) : null}

      {error ? <p className="team-error">{error}</p> : null}
      {success ? <p className="billing-success">{success}</p> : null}

      {!isOwner ? (
        <div className="dash-panel p-5 text-sm text-[var(--gray-600)]">
          Ask your company owner to upgrade. You can still share this page with them.
        </div>
      ) : null}

      <div className="billing-grid">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentCode;
          const isUpgrade =
            Number(plan.price_kes_monthly) > Number(
              typeof company?.plan === "object" && company.plan
                ? company.plan.price_kes_monthly
                : 0,
            ) || (isCurrent === false && plan.code !== "free");
          return (
            <article
              key={plan.code}
              className={`billing-card${isCurrent ? " is-current" : ""}${plan.code === "starter" ? " is-featured" : ""}`}
            >
              <p className="billing-card__name">{plan.name}</p>
              <p className="billing-card__price">{formatPlanPrice(plan)}</p>
              <p className="billing-card__desc">{plan.description}</p>
              <ul className="billing-card__limits">
                <li>{plan.max_projects} projects</li>
                <li>{plan.max_users} team seats</li>
                <li>{plan.max_storage_gb} GB storage</li>
              </ul>
              {isCurrent ? (
                <Button type="button" variant="outline" disabled>
                  Current plan
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!isOwner || busyCode !== null}
                  onClick={() => void onUpgrade(plan.code)}
                >
                  {busyCode === plan.code
                    ? "Updating…"
                    : isUpgrade
                      ? `Upgrade to ${plan.name}`
                      : `Switch to ${plan.name}`}
                </Button>
              )}
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button href="/dashboard/settings" variant="outline" size="sm">
          Back to settings
        </Button>
        <Button href={nextPath.startsWith("/") ? nextPath : "/dashboard/projects"} variant="ghost" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}
