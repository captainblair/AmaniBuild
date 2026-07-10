"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { registerAccount } from "@/lib/api/auth";
import { setPendingOtp } from "@/lib/auth/otp-session";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await registerAccount({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      setPendingOtp({
        challenge_id: result.otp.challenge_id,
        purpose: "registration",
        email: result.otp.delivery.email ?? form.email.trim(),
        expires_at: result.otp.expires_at,
        debug_otp: result.otp.debug_otp,
      });
      router.push("/verify-otp");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to create account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      headline={
        <>
          You&apos;re a few steps away from{" "}
          <span className="text-[var(--orange)]">smarter project management.</span>
        </>
      }
      subhead="Join construction companies across Kenya already running sites on AmaniBuild."
    >
      <AuthCard
        title="Create your account"
        subtitle="Start free. Verify your email, then set up your company workspace."
      >
        <form className="space-y-3.5" onSubmit={onSubmit}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <TextInput
              label="First name"
              name="first_name"
              required
              autoComplete="given-name"
              value={form.first_name}
              onChange={update("first_name")}
            />
            <TextInput
              label="Last name"
              name="last_name"
              required
              autoComplete="family-name"
              value={form.last_name}
              onChange={update("last_name")}
            />
          </div>
          <TextInput
            label="Work email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@company.co.ke"
            value={form.email}
            onChange={update("email")}
          />
          <TextInput
            label="Phone (optional)"
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="+254 7XX XXX XXX"
            value={form.phone}
            onChange={update("phone")}
          />
          <TextInput
            label="Password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters"
            value={form.password}
            onChange={update("password")}
            minLength={8}
          />

          {error ? (
            <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Continue"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--gray-500)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--orange)] hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthSplitLayout>
  );
}
