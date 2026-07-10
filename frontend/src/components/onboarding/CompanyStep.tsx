"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { createOnboardingCompany } from "@/lib/api/onboarding";
import type { Company, SubscriptionPlan } from "@/lib/api/types";

type CompanyStepProps = {
  plans: SubscriptionPlan[];
  onDone: (company: Company) => void;
};

export function CompanyStep({ plans, onDone }: CompanyStepProps) {
  const [form, setForm] = useState({
    name: "",
    legal_name: "",
    registration_number: "",
    kra_pin: "",
    email: "",
    phone: "",
    city: "",
    county: "",
    address_line: "",
    plan_code: "free",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await createOnboardingCompany({
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || undefined,
        registration_number: form.registration_number.trim() || undefined,
        kra_pin: form.kra_pin.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        county: form.county.trim() || undefined,
        address_line: form.address_line.trim() || undefined,
        plan_code: form.plan_code,
      });
      onDone(result.company);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mx-auto max-w-xl space-y-4" onSubmit={onSubmit}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange)]">
          Step 1 of 4
        </p>
        <h1
          className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Let&apos;s get to know your company
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)]">
          This sets up your AmaniBuild workspace for your construction business in Kenya.
        </p>
      </div>

      <TextInput
        label="Company name"
        name="name"
        required
        placeholder="Simba Contractors Ltd."
        value={form.name}
        onChange={update("name")}
      />
      <TextInput
        label="Legal name (optional)"
        name="legal_name"
        value={form.legal_name}
        onChange={update("legal_name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Registration number"
          name="registration_number"
          value={form.registration_number}
          onChange={update("registration_number")}
        />
        <TextInput
          label="KRA PIN"
          name="kra_pin"
          value={form.kra_pin}
          onChange={update("kra_pin")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Company email"
          type="email"
          name="email"
          placeholder="admin@company.co.ke"
          value={form.email}
          onChange={update("email")}
        />
        <TextInput
          label="Phone"
          type="tel"
          name="phone"
          placeholder="+254 7XX XXX XXX"
          value={form.phone}
          onChange={update("phone")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="City" name="city" placeholder="Nairobi" value={form.city} onChange={update("city")} />
        <TextInput
          label="County"
          name="county"
          placeholder="Nairobi"
          value={form.county}
          onChange={update("county")}
        />
      </div>
      <TextInput
        label="Address"
        name="address_line"
        value={form.address_line}
        onChange={update("address_line")}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Plan</label>
        <select
          className="w-full rounded-[var(--radius)] border border-[var(--gray-200)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-[var(--orange)]/20"
          value={form.plan_code}
          onChange={update("plan_code")}
        >
          {plans.map((plan) => (
            <option key={plan.code} value={plan.code}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-[var(--orange)]/20 bg-[var(--orange-soft)] px-4 py-3 text-sm text-[var(--navy)]">
        We use this to configure your workspace, billing plan, and team permissions. You can update
        it later in settings.
      </div>

      {error ? (
        <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
        {loading ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
