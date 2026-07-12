"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  createInvitation,
  deleteInvitation,
  fetchCompanyRoles,
  fetchInvitations,
} from "@/lib/api/onboarding";
import {
  deactivateCompanyMember,
  fetchCompanyMembers,
  resendInvitation,
  updateCompanyMember,
} from "@/lib/api/team";
import type { CompanyMember, CompanyRoleOption, TeamInvitation } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { roleLabel } from "@/lib/nav/roles";

export function UsersPage() {
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_team");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invites, setInvites] = useState<TeamInvitation[]>([]);
  const [roles, setRoles] = useState<CompanyRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("worker");
  const [jobTitle, setJobTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memberList, inviteList] = await Promise.all([
        fetchCompanyMembers(),
        canManage ? fetchInvitations() : Promise.resolve([] as TeamInvitation[]),
      ]);
      setMembers(memberList);
      setInvites(inviteList.filter((i) => i.status === "pending" && !i.is_expired));
      if (canManage) {
        const roleList = await fetchCompanyRoles();
        setRoles(roleList);
        setRole((current) =>
          roleList.some((r) => r.value === current) ? current : roleList[0]?.value || "worker",
        );
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load team.");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createInvitation({
        email: email.trim(),
        role,
        job_title: jobTitle.trim() || undefined,
      });
      setEmail("");
      setJobTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not send invite.");
    } finally {
      setBusy(false);
    }
  }

  async function onRoleChange(member: CompanyMember, nextRole: string) {
    if (!canManage || member.role === nextRole) return;
    setBusy(true);
    try {
      await updateCompanyMember(member.id, { role: nextRole });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update role.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate(member: CompanyMember) {
    if (!canManage) return;
    if (!window.confirm(`Deactivate ${member.user_name}?`)) return;
    setBusy(true);
    try {
      await deactivateCompanyMember(member.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not deactivate member.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading team…" />
      </div>
    );
  }

  return (
    <div className="team-page">
      <header>
        <p className="team-eyebrow">Administration</p>
        <h1 className="team-title">User management</h1>
        <p className="team-sub">
          Company members and pending invitations for {membership.company_name}.
        </p>
      </header>

      {error ? <p className="team-error">{error}</p> : null}

      {!canManage ? (
        <p className="text-sm text-[var(--gray-500)]">
          You can view the roster. Only managers can invite or change roles.
        </p>
      ) : null}

      <section className="dash-panel overflow-hidden">
        <div className="border-b border-[var(--dash-line,var(--gray-200))] px-4 py-3">
          <h2 className="dash-panel__title">Team members ({members.length})</h2>
        </div>
        {members.length === 0 ? (
          <EmptyState title="No members yet" description="Invite your first teammate to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  {canManage ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <p className="font-semibold text-[var(--navy)]">{member.user_name}</p>
                      <p className="text-xs text-[var(--gray-500)]">
                        {member.user_email}
                        {member.job_title ? ` · ${member.job_title}` : ""}
                      </p>
                    </td>
                    <td>
                      {canManage ? (
                        <select
                          className="team-select"
                          value={member.role}
                          disabled={busy}
                          onChange={(e) => void onRoleChange(member, e.target.value)}
                        >
                          <option value={member.role}>{roleLabel(member.role)}</option>
                          {roles
                            .filter((r) => r.value !== member.role)
                            .map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                        </select>
                      ) : (
                        roleLabel(member.role)
                      )}
                    </td>
                    <td>
                      <span className={`team-pill${member.is_active ? " is-on" : ""}`}>
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage ? (
                      <td>
                        {member.is_active ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void onDeactivate(member)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              void updateCompanyMember(member.id, { is_active: true }).then(load)
                            }
                          >
                            Reactivate
                          </Button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canManage ? (
        <>
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Invite teammate</h2>
            <form onSubmit={(e) => void onInvite(e)} className="team-invite mt-3">
              <input
                className="team-input"
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <select className="team-select" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                className="team-input"
                placeholder="Job title (optional)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send invite"}
              </Button>
            </form>
          </section>

          <section className="dash-panel overflow-hidden">
            <div className="border-b border-[var(--dash-line,var(--gray-200))] px-4 py-3">
              <h2 className="dash-panel__title">Pending invitations</h2>
            </div>
            {invites.length === 0 ? (
              <EmptyState title="No pending invites" description="New invitations will show here." />
            ) : (
              <ul className="team-invites">
                {invites.map((invite) => (
                  <li key={invite.id}>
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{invite.email}</p>
                      <p className="text-xs text-[var(--gray-500)]">
                        {roleLabel(invite.role)}
                        {invite.is_expired ? " · Expired" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void resendInvitation(invite.id).then(load)}
                      >
                        Resend
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void deleteInvitation(invite.id).then(load)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
