"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchProjectClientAccess,
  grantProjectClientAccess,
  revokeProjectClientAccess,
} from "@/lib/api/client-portal";
import { fetchCompanyMembers } from "@/lib/api/team";
import type { ClientAccessGrant, CompanyMember } from "@/lib/api/types";
import { formatPortalDate } from "@/lib/portal/labels";

type Props = { projectId: string };

export function ClientAccessPanel({ projectId }: Props) {
  const [grants, setGrants] = useState<ClientAccessGrant[]>([]);
  const [clients, setClients] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientUserId, setClientUserId] = useState("");
  const [canViewBudget, setCanViewBudget] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [access, members] = await Promise.all([
        fetchProjectClientAccess(projectId),
        fetchCompanyMembers(),
      ]);
      setGrants(access);
      setClients(members.filter((m) => m.role === "client" && m.is_active));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load client access.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableClients = useMemo(() => {
    const granted = new Set(grants.map((g) => g.client_user_id));
    return clients.filter((c) => !granted.has(c.user_id));
  }, [clients, grants]);

  async function onGrant(e: FormEvent) {
    e.preventDefault();
    if (!clientUserId) return;
    setSaving(true);
    setError(null);
    try {
      await grantProjectClientAccess(projectId, {
        client_user_id: clientUserId,
        can_view_budget: canViewBudget,
      });
      setClientUserId("");
      setCanViewBudget(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not grant access.");
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke(userId: string, name: string) {
    if (!window.confirm(`Revoke portal access for ${name}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await revokeProjectClientAccess(projectId, userId);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not revoke access.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="dash-panel p-4">
        <Spinner label="Loading client access…" />
      </section>
    );
  }

  return (
    <section className="dash-panel p-4">
      <h2 className="dash-panel__title">Client portal access</h2>
      <p className="mt-1 text-sm text-[var(--gray-500)]">
        Grant read-only progress views to company members with the Client role.
      </p>

      {error ? <p className="mt-3 text-sm text-[var(--red)]">{error}</p> : null}

      <ul className="mt-4 space-y-2">
        {grants.length === 0 ? (
          <li className="text-sm text-[var(--gray-500)]">No clients have access yet.</li>
        ) : (
          grants.map((grant) => (
            <li
              key={grant.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--dash-line,var(--gray-200))] bg-[var(--dash-soft,var(--gray-50))] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--navy)]">
                  {grant.client_user_name}
                </p>
                <p className="truncate text-xs text-[var(--gray-500)]">
                  {grant.client_user_email}
                  {grant.can_view_budget ? " · Budget visible" : " · Budget hidden"}
                  {" · "}
                  {formatPortalDate(grant.granted_at)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => void onRevoke(grant.client_user_id, grant.client_user_name)}
              >
                Revoke
              </Button>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={(e) => void onGrant(e)} className="mt-4 space-y-3 border-t border-[var(--dash-line,var(--gray-200))] pt-4">
        <label className="block text-xs font-semibold text-[var(--gray-600)]">
          Grant access
          <select
            className="mt-1 w-full rounded-xl border border-[var(--dash-line,var(--gray-200))] bg-white px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[rgba(234,179,8,0.55)]"
            value={clientUserId}
            onChange={(e) => setClientUserId(e.target.value)}
            disabled={saving || availableClients.length === 0}
          >
            <option value="">
              {availableClients.length === 0 ? "No eligible clients" : "Select client…"}
            </option>
            {availableClients.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.user_name} ({member.user_email})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--gray-600)]">
          <input
            type="checkbox"
            checked={canViewBudget}
            onChange={(e) => setCanViewBudget(e.target.checked)}
            disabled={saving}
          />
          Allow budget visibility
        </label>
        <Button type="submit" size="sm" disabled={saving || !clientUserId}>
          {saving ? "Saving…" : "Grant access"}
        </Button>
      </form>
    </section>
  );
}
