"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchCompanySites } from "@/lib/api/sites";
import { fetchCompany } from "@/lib/api/team";
import type { Company, Site } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { roleLabel } from "@/lib/nav/roles";

export function SettingsPage() {
  const { user, membership } = useDashboardSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [c, s] = await Promise.all([fetchCompany(), fetchCompanySites()]);
        if (!cancelled) {
          setCompany(c);
          setSites(s);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Could not load settings.");
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading settings…" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header>
        <p className="team-eyebrow">Administration</p>
        <h1 className="team-title">Settings</h1>
        <p className="team-sub">Company profile, sites, and your account.</p>
      </header>

      {error ? <p className="team-error">{error}</p> : null}

      <section className="dash-panel p-5">
        <h2 className="dash-panel__title">Your account</h2>
        <dl className="settings-meta mt-4">
          <dt>Name</dt>
          <dd>{user.full_name || `${user.first_name} ${user.last_name}`}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd>{roleLabel(membership.role)}</dd>
        </dl>
      </section>

      <section className="dash-panel p-5">
        <h2 className="dash-panel__title">Company</h2>
        {company ? (
          <dl className="settings-meta mt-4 settings-grid">
            <div>
              <dt>Name</dt>
              <dd>{company.name}</dd>
            </div>
            <div>
              <dt>Legal name</dt>
              <dd>{company.legal_name || "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{company.email || "—"}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{company.phone || "—"}</dd>
            </div>
            <div>
              <dt>County</dt>
              <dd>{company.county || "—"}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                {typeof company.plan === "string"
                  ? company.plan
                  : company.plan?.name || "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--gray-500)]">Company profile unavailable.</p>
        )}
      </section>

      <section className="dash-panel p-5">
        <h2 className="dash-panel__title">Sites ({sites.length})</h2>
        {sites.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--gray-500)]">No sites configured yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sites.map((site) => (
              <li
                key={site.id}
                className="rounded-xl border border-[var(--dash-line,var(--gray-200))] bg-[var(--dash-soft,var(--gray-50))] px-3 py-2.5"
              >
                <p className="font-semibold text-[var(--navy)]">
                  {site.name}
                  {site.is_primary ? " · Primary" : ""}
                </p>
                <p className="text-xs text-[var(--gray-500)]">
                  {[site.city, site.county].filter(Boolean).join(", ") || site.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
