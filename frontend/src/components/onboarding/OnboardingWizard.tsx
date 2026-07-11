"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyStep } from "@/components/onboarding/CompanyStep";
import { InviteStep } from "@/components/onboarding/InviteStep";
import {
  OnboardingShell,
  type OnboardingStepKey,
} from "@/components/onboarding/OnboardingShell";
import { ReviewStep } from "@/components/onboarding/ReviewStep";
import { SiteStep } from "@/components/onboarding/SiteStep";
import { Spinner } from "@/components/ui/Spinner";
import { getAccessToken } from "@/lib/auth/storage";
import { setCompanyId } from "@/lib/auth/storage";
import { fetchSubscriptionPlans } from "@/lib/api/plans";
import {
  fetchCompanyRoles,
  fetchInvitations,
  fetchOnboardingStatus,
} from "@/lib/api/onboarding";
import type {
  Company,
  CompanyRoleOption,
  OnboardingStatus,
  Site,
  SubscriptionPlan,
  TeamInvitation,
} from "@/lib/api/types";

function stepFromStatus(status: OnboardingStatus): OnboardingStepKey {
  if (status.is_complete || status.next_action === null) return "review";
  if (status.next_action === "create_company") return "company";
  if (status.next_action === "create_site") return "site";
  if (status.next_action === "invite_team") return "invite";
  return "review";
}

export function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<OnboardingStepKey>("company");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [roles, setRoles] = useState<CompanyRoleOption[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

  useEffect(() => {
    async function boot() {
      if (!getAccessToken()) {
        router.replace("/login");
        return;
      }

      try {
        const [status, planList] = await Promise.all([
          fetchOnboardingStatus(),
          fetchSubscriptionPlans(),
        ]);
        setPlans(planList.filter((plan) => plan.code !== "enterprise"));

        if (status.is_complete) {
          router.replace("/dashboard");
          return;
        }

        if (status.company) {
          setCompany(status.company);
          setCompanyId(status.company.id);
        }
        if (status.primary_site) setSite(status.primary_site);

        const nextStep = stepFromStatus(status);
        setStep(nextStep);

        if (status.company && (nextStep === "invite" || nextStep === "review")) {
          const [roleList, inviteList] = await Promise.all([
            fetchCompanyRoles().catch(() => []),
            fetchInvitations().catch(() => []),
          ]);
          setRoles(roleList);
          setInvitations(inviteList);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load onboarding.");
      } finally {
        setLoading(false);
      }
    }

    void boot();
  }, [router]);

  async function loadInviteData() {
    const [roleList, inviteList] = await Promise.all([
      fetchCompanyRoles().catch(() => []),
      fetchInvitations().catch(() => []),
    ]);
    setRoles(roleList);
    setInvitations(inviteList);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-light)]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-light)] px-6">
        <div className="max-w-md border-2 border-[var(--navy)] bg-white p-8 text-center shadow-[8px_8px_0_var(--orange)]">
          <p className="text-sm text-[var(--red)]">{error}</p>
          <button
            type="button"
            className="mt-4 text-sm font-bold uppercase tracking-wide text-[var(--navy)]"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sidePanel =
    step === "company" ? (
      <div className="ob-aside-card">
        <p className="ob-aside-card__eyebrow">Why we ask</p>
        <h2 className="ob-aside-card__title">Company details unlock your workspace</h2>
        <p className="ob-aside-card__text">
          These details power branding, billing plan, and team permissions across every site.
        </p>
        <ul className="ob-aside-card__list">
          <li>Workspace name and branding</li>
          <li>Plan limits for projects and users</li>
          <li>Role-based access for your team</li>
        </ul>
      </div>
    ) : step === "site" ? (
      <div className="ob-aside-card">
        <p className="ob-aside-card__eyebrow">Site preview</p>
        <h2 className="ob-aside-card__title">{site?.name ?? "Your first site"}</h2>
        <p className="ob-aside-card__text">
          Start in planning mode. You can customize modules and settings after setup.
        </p>
      </div>
    ) : step === "invite" ? (
      <div className="ob-aside-card">
        <p className="ob-aside-card__eyebrow">Roles</p>
        <h2 className="ob-aside-card__title">What each role can access</h2>
        <p className="ob-aside-card__text">
          Roles control diary, attendance, procurement, and finance permissions. Owners keep full
          control.
        </p>
      </div>
    ) : (
      <div className="ob-aside-card">
        <p className="ob-aside-card__eyebrow">Almost there</p>
        <h2 className="ob-aside-card__title">Ready to launch</h2>
        <p className="ob-aside-card__text">
          Completing setup unlocks your dashboard, projects, and site tools.
        </p>
      </div>
    );

  return (
    <OnboardingShell activeStep={step} sidePanel={sidePanel}>
      {step === "company" ? (
        <CompanyStep
          plans={plans}
          onDone={(created) => {
            setCompany(created);
            setStep("site");
          }}
        />
      ) : null}

      {step === "site" && company ? (
        <SiteStep
          companyName={company.name}
          onDone={async (created) => {
            setSite(created);
            await loadInviteData();
            setStep("invite");
          }}
        />
      ) : null}

      {step === "invite" ? (
        <InviteStep
          roles={roles}
          invitations={invitations}
          onInvitationsChange={setInvitations}
          onContinue={() => setStep("review")}
          onSkip={() => setStep("review")}
        />
      ) : null}

      {step === "review" && company ? (
        <ReviewStep
          company={company}
          site={site}
          invitations={invitations}
          onBack={() => setStep("invite")}
          onDone={() => router.push("/dashboard")}
        />
      ) : null}
    </OnboardingShell>
  );
}
