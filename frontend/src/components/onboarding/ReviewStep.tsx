"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { completeOnboarding } from "@/lib/api/onboarding";
import type { Company, Site, TeamInvitation } from "@/lib/api/types";

type ReviewStepProps = {
  company: Company;
  site: Site | null;
  invitations: TeamInvitation[];
  onBack?: () => void;
  onDone: () => void;
};

export function ReviewStep({ company, site, invitations, onBack, onDone }: ReviewStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function finish() {
    setError(null);
    setLoading(true);
    try {
      await completeOnboarding();
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not complete onboarding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ob-form space-y-5">
      <header className="ob-form__header">
        <p className="ob-form__step">Step 4 of 4</p>
        <h1 className="ob-form__title">Review & finish</h1>
        <p className="ob-form__lede">
          Confirm your workspace details, then launch your AmaniBuild dashboard.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--gray-200)] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--gray-400)]">Company</h2>
        <p className="mt-2 text-lg font-bold text-[var(--navy)]">{company.name}</p>
        <p className="text-sm text-[var(--gray-500)]">
          {[company.city, company.county].filter(Boolean).join(", ") || "Kenya"} · Plan:{" "}
          {company.plan}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--gray-200)] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--gray-400)]">
          Primary site
        </h2>
        {site ? (
          <>
            <p className="mt-2 text-lg font-bold text-[var(--navy)]">{site.name}</p>
            <p className="text-sm text-[var(--gray-500)]">
              {site.site_type.replace("_", " ")} · {site.status}
              {site.city ? ` · ${site.city}` : ""}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--gray-500)]">No site created yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--gray-200)] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--gray-400)]">
          Team invites
        </h2>
        {invitations.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--gray-500)]">No invites sent — you can add people later.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--navy)]">
            {invitations.map((invite) => (
              <li key={invite.id}>
                {invite.email} · {invite.role_label}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
        <Button type="button" onClick={finish} disabled={loading}>
          {loading ? "Finishing…" : "Launch workspace"}
        </Button>
      </div>
    </div>
  );
}
