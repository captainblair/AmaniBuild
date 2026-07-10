"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { login, persistSession, postAuthRedirectPath } from "@/lib/api/auth";
import { setPendingOtp } from "@/lib/auth/otp-session";
import { LogoMark } from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (result.mfa_required) {
        setPendingOtp({
          challenge_id: result.otp.challenge_id,
          purpose: "login",
          email: result.otp.delivery.email ?? email.trim(),
          expires_at: result.otp.expires_at,
          debug_otp: result.otp.debug_otp,
        });
        router.push("/verify-otp");
        return;
      }
      const me = await persistSession(result.tokens);
      router.push(postAuthRedirectPath(me));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to sign in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to manage your construction sites and teams."
        icon={<LogoMark size="lg" className="rounded-xl" />}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <TextInput
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@company.co.ke"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div>
            <TextInput
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-[var(--orange)] hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--gray-500)]">
          New to AmaniBuild?{" "}
          <Link href="/register" className="font-semibold text-[var(--orange)] hover:underline">
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthSplitLayout>
  );
}
