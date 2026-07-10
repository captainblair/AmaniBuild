"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { ApiClientError } from "@/lib/api/client";
import {
  loginMfa,
  persistSession,
  postAuthRedirectPath,
  resendOtp,
  verifyPasswordOtp,
  verifyRegistrationOtp,
} from "@/lib/api/auth";
import {
  clearPendingOtp,
  getPendingOtp,
  setPendingOtp,
  setResetToken,
  type PendingOtp,
} from "@/lib/auth/otp-session";
import { LogoMark } from "@/components/ui/Logo";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingOtp | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const stored = getPendingOtp();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setPending(stored);
    if (stored.debug_otp) {
      setCode(stored.debug_otp);
    }
  }, [router]);

  const title = useMemo(() => {
    if (!pending) return "Verify your account";
    if (pending.purpose === "login") return "Confirm it's you";
    if (pending.purpose === "password_reset") return "Enter reset code";
    return "Verify your account";
  }, [pending]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!pending || code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      if (pending.purpose === "registration") {
        const result = await verifyRegistrationOtp({
          challenge_id: pending.challenge_id,
          code,
        });
        clearPendingOtp();
        const me = await persistSession(result.tokens);
        router.push(postAuthRedirectPath(me));
        return;
      }

      if (pending.purpose === "login") {
        const result = await loginMfa({
          challenge_id: pending.challenge_id,
          code,
        });
        clearPendingOtp();
        const me = await persistSession(result.tokens);
        router.push(postAuthRedirectPath(me));
        return;
      }

      const result = await verifyPasswordOtp({
        challenge_id: pending.challenge_id,
        code,
      });
      clearPendingOtp();
      setResetToken(result.reset_token);
      router.push("/reset-password");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!pending) return;
    setResending(true);
    setError(null);
    try {
      const result = await resendOtp(pending.challenge_id);
      const next: PendingOtp = {
        challenge_id: result.otp.challenge_id,
        purpose: pending.purpose,
        email: result.otp.delivery.email ?? pending.email,
        expires_at: result.otp.expires_at,
        debug_otp: result.otp.debug_otp,
      };
      setPendingOtp(next);
      setPending(next);
      setCode(result.otp.debug_otp ?? "");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  if (!pending) {
    return (
      <AuthCenterLayout>
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--gray-500)]">
          Loading…
        </div>
      </AuthCenterLayout>
    );
  }

  return (
    <AuthCenterLayout>
      <AuthCard
        title={title}
        subtitle={
          pending.debug_otp
            ? "Email delivery is stubbed in local testing. Use the test code below (also filled in for you)."
            : `We've sent a 6-digit verification code to ${pending.email ?? "your email"}. Enter it below to continue.`
        }
        icon={<LogoMark size="lg" className="rounded-xl" />}
      >
        {pending.debug_otp ? (
          <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--orange)] bg-[var(--orange-soft)] px-4 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--navy)]">
              Test verification code
            </p>
            <p
              className="mt-2 font-mono text-3xl font-extrabold tracking-[0.35em] text-[var(--navy)]"
              style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
            >
              {pending.debug_otp}
            </p>
            <p className="mt-2 text-xs text-[var(--gray-600)]">
              Randomly generated for this attempt · not sent by email in local mode
            </p>
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          <OtpInput value={code} onChange={setCode} disabled={loading} />

          {error ? (
            <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-center text-sm text-[var(--red)]">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? "Verifying…" : "Verify & Continue"}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            className="font-medium text-[var(--orange)] hover:underline disabled:opacity-50"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
          <Link href="/login" className="text-[var(--gray-500)] hover:text-[var(--navy)]">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthCenterLayout>
  );
}
