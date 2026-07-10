"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { createInvitation, deleteInvitation } from "@/lib/api/onboarding";
import type { CompanyRoleOption, TeamInvitation } from "@/lib/api/types";

type InviteRow = {
  id: string;
  email: string;
  role: string;
};

type InviteStepProps = {
  roles: CompanyRoleOption[];
  invitations: TeamInvitation[];
  onInvitationsChange: (invitations: TeamInvitation[]) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack?: () => void;
};

const QUICK_ROLES = ["foreman", "site_engineer", "store_keeper"];

export function InviteStep({
  roles,
  invitations,
  onInvitationsChange,
  onContinue,
  onSkip,
  onBack,
}: InviteStepProps) {
  const defaultRole = roles[0]?.value ?? "foreman";
  const [rows, setRows] = useState<InviteRow[]>([
    { id: crypto.randomUUID(), email: "", role: defaultRole },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleCards = useMemo(
    () =>
      [
        { value: "foreman", tag: "Field Access", color: "text-[var(--orange)] bg-[var(--orange-soft)]" },
        { value: "site_engineer", tag: "Field Access", color: "text-blue-700 bg-blue-50" },
        { value: "project_manager", tag: "Full Access", color: "text-purple-700 bg-purple-50" },
        { value: "accountant", tag: "Finance Access", color: "text-green-700 bg-green-50" },
      ].filter((item) => roles.some((role) => role.value === item.value)),
    [roles],
  );

  function addRow(role?: string) {
    setRows((current) => [
      ...current,
      { id: crypto.randomUUID(), email: "", role: role ?? defaultRole },
    ]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validRows = rows.filter((row) => row.email.trim());
    if (validRows.length === 0) {
      onContinue();
      return;
    }

    setLoading(true);
    try {
      const created: TeamInvitation[] = [...invitations];
      for (const row of validRows) {
        const result = await createInvitation({
          email: row.email.trim(),
          role: row.role,
        });
        created.push(result.invitation);
      }
      onInvitationsChange(created);
      onContinue();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not send invites.");
    } finally {
      setLoading(false);
    }
  }

  async function removeInvitation(id: string) {
    try {
      await deleteInvitation(id);
      onInvitationsChange(invitations.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not remove invitation.");
    }
  }

  return (
    <form className="mx-auto max-w-2xl space-y-5" onSubmit={onSubmit}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange)]">
          Step 3 of 4
        </p>
        <h1
          className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Invite your team
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)]">
          Add colleagues by email and assign roles. You can skip this and invite people later.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <TextInput
              label={index === 0 ? "Team member email" : `Member ${index + 1}`}
              type="email"
              placeholder="name@company.co.ke"
              value={row.email}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id ? { ...item, email: event.target.value } : item,
                  ),
                )
              }
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Role</label>
              <select
                className="w-full rounded-[var(--radius)] border border-[var(--gray-200)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--orange)]"
                value={row.role}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.id === row.id ? { ...item, role: event.target.value } : item,
                    ),
                  )
                }
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <button
                type="button"
                className="text-sm text-[var(--gray-400)] hover:text-[var(--red)]"
                onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                disabled={rows.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addRow()}
        className="rounded-[var(--radius)] border border-dashed border-blue-300 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
      >
        + Add another member
      </button>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--navy)]">Quick add from templates</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ROLES.filter((value) => roles.some((role) => role.value === value)).map((value) => {
            const role = roles.find((item) => item.value === value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => addRow(value)}
                className="rounded-full border border-[var(--gray-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--navy)] hover:border-[var(--orange)]"
              >
                + {role?.label ?? value}
              </button>
            );
          })}
        </div>
      </div>

      {invitations.length > 0 ? (
        <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--navy)]">Pending invitations</p>
          <ul className="space-y-2">
            {invitations.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between text-sm">
                <span>
                  {invite.email} · {invite.role_label}
                </span>
                <button
                  type="button"
                  className="text-[var(--gray-400)] hover:text-[var(--red)]"
                  onClick={() => removeInvitation(invite.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {roleCards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {roleCards.map((card) => {
            const role = roles.find((item) => item.value === card.value);
            return (
              <div key={card.value} className="rounded-xl border border-[var(--gray-200)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--navy)]">{role?.label}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${card.color}`}>
                  {card.tag}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send Invites"}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
