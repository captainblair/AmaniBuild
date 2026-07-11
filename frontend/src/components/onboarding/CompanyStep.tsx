"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { createOnboardingCompany } from "@/lib/api/onboarding";
import { formatKes } from "@/lib/format";
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
    plan_code: plans[0]?.code ?? "free",
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
    <form className="ob-form" onSubmit={onSubmit}>
      <header className="ob-form__header">
        <p className="ob-form__step">Step 1 of 4</p>
        <h1 className="ob-form__title">Let&apos;s get to know your company</h1>
        <p className="ob-form__lede">
          This sets up your AmaniBuild workspace for your construction business in Kenya.
        </p>
      </header>

      <div className="ob-form__grid">
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
      </div>

      <div className="ob-form__section">
        <p className="ob-form__section-title">Registration</p>
        <div className="ob-form__grid ob-form__grid--2">
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
      </div>

      <div className="ob-form__section">
        <p className="ob-form__section-title">Contact</p>
        <div className="ob-form__grid ob-form__grid--2">
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
      </div>

      <div className="ob-form__section">
        <p className="ob-form__section-title">Location</p>
        <div className="ob-form__grid ob-form__grid--2">
          <TextInput
            label="City"
            name="city"
            placeholder="Nairobi"
            value={form.city}
            onChange={update("city")}
          />
          <TextInput
            label="County"
            name="county"
            placeholder="Nairobi"
            value={form.county}
            onChange={update("county")}
          />
        </div>
        <div className="mt-4">
          <TextInput
            label="Address"
            name="address_line"
            value={form.address_line}
            onChange={update("address_line")}
          />
        </div>
      </div>

      <div className="ob-form__section">
        <p className="ob-form__section-title">Plan</p>
        <div className="ob-plan-grid" role="radiogroup" aria-label="Subscription plan">
          {plans.map((plan) => {
            const selected = form.plan_code === plan.code;
            const price = Number(plan.price_kes_monthly);
            return (
              <button
                key={plan.code}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`ob-plan${selected ? " is-selected" : ""}`}
                onClick={() => setForm((current) => ({ ...current, plan_code: plan.code }))}
              >
                <span className="ob-plan__name">{plan.name}</span>
                <span className="ob-plan__price">
                  {price === 0 ? "Free" : `${formatKes(price)}/mo`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ob-note">
        We use this to configure your workspace, billing plan, and team permissions. You can update
        it later in settings.
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">
          {error}
        </p>
      ) : null}

      <div className="ob-actions">
        <Button type="submit" disabled={loading} className="min-w-[160px]">
          {loading ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
