"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { forgotPassword } from "@/lib/api/auth";
import { setPendingOtp } from "@/lib/auth/otp-session";
import { LogoMark } from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await forgotPassword(email.trim());
      if (!result.otp) {
        setError("If an account exists for that email, a reset code will be sent.");
        setLoading(false);
        return;
      }
      setPendingOtp({
        challenge_id: result.otp.challenge_id,
        purpose: "password_reset",
        email: result.otp.delivery.email ?? email.trim(),
        expires_at: result.otp.expires_at,
        debug_otp: result.otp.debug_otp,
      });
      router.push("/verify-otp");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to start password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCenterLayout>
      <AuthCard
        title="Reset your password"
        subtitle="Enter the email associated with your account and we'll send a 6-digit reset code."
        icon={<LogoMark size="lg" className="rounded-xl" />}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <TextInput
            label="Email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@company.co.ke"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {error ? (
            <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Code"}
          </Button>
          <Button href="/login" variant="outline" className="w-full">
            Back to sign in
          </Button>
        </form>
      </AuthCard>
    </AuthCenterLayout>
  );
}
