"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { resetPassword } from "@/lib/api/auth";
import { clearResetToken, getResetToken } from "@/lib/auth/otp-session";
import { LogoMark } from "@/components/ui/Logo";

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [resetToken, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getResetToken();
    if (!token) {
      router.replace("/forgot-password");
      return;
    }
    setToken(token);
  }, [router]);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const allValid = Object.values(checks).every(Boolean) && password === confirm;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!resetToken || !allValid) return;
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ reset_token: resetToken, new_password: password });
      clearResetToken();
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to update password.");
    } finally {
      setLoading(false);
    }
  }

  if (!resetToken && !done) {
    return (
      <AuthCenterLayout>
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--gray-500)]">
          Loading…
        </div>
      </AuthCenterLayout>
    );
  }

  if (done) {
    return (
      <AuthCenterLayout>
        <AuthCard
          title="Password updated successfully!"
          subtitle="You can now sign in with your new password."
          icon={<LogoMark size="xl" className="rounded-xl" />}
        >
          <Button href="/login" className="w-full">
            Continue to Sign In
          </Button>
        </AuthCard>
      </AuthCenterLayout>
    );
  }

  return (
    <AuthCenterLayout>
      <AuthCard
        title="Create new password"
        subtitle="Choose a strong password you haven't used before."
        icon={<LogoMark size="lg" className="rounded-xl" />}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <TextInput
            label="New password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextInput
            label="Confirm new password"
            type="password"
            name="confirm"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={confirm && confirm !== password ? "Passwords do not match" : undefined}
          />

          <ul className="space-y-1.5 text-xs">
            {(
              [
                ["length", "At least 8 characters"],
                ["upper", "One uppercase letter"],
                ["lower", "One lowercase letter"],
                ["number", "One number"],
              ] as const
            ).map(([key, label]) => (
              <li
                key={key}
                className={checks[key] ? "text-[var(--green)]" : "text-[var(--gray-400)]"}
              >
                {checks[key] ? "✓" : "○"} {label}
              </li>
            ))}
          </ul>

          {error ? (
            <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading || !allValid}>
            {loading ? "Updating…" : "Update Password"}
          </Button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-[var(--gray-500)] hover:text-[var(--navy)]">
              Back to sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthCenterLayout>
  );
}
