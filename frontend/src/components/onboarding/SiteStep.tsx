"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { createOnboardingSite } from "@/lib/api/onboarding";
import type { Site } from "@/lib/api/types";

const SITE_TYPES = [
  { value: "residential", label: "Residential Building" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "mixed_use", label: "Mixed Use" },
];

type SiteStepProps = {
  companyName: string;
  onDone: (site: Site) => void;
  onBack?: () => void;
};

export function SiteStep({ companyName, onDone, onBack }: SiteStepProps) {
  const [form, setForm] = useState({
    name: "",
    site_type: "residential",
    address_line: "",
    city: "Nairobi",
    county: "",
    expected_start_date: "",
    expected_end_date: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await createOnboardingSite({
        name: form.name.trim(),
        site_type: form.site_type,
        status: "planning",
        address_line: form.address_line.trim() || undefined,
        city: form.city.trim() || undefined,
        county: form.county.trim() || undefined,
        expected_start_date: form.expected_start_date || undefined,
        expected_end_date: form.expected_end_date || undefined,
        description: form.description.trim() || undefined,
        is_primary: true,
      });
      onDone(result.site);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create site.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mx-auto max-w-xl space-y-4" onSubmit={onSubmit}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange)]">
          Step 2 of 4
        </p>
        <h1
          className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Add your first site
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)]">
          Create the primary project site for <strong>{companyName}</strong>. You can add more sites
          later.
        </p>
      </div>

      <TextInput
        label="Site / project name"
        name="name"
        required
        placeholder="Riverside Heights Apartments"
        value={form.name}
        onChange={update("name")}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Site type</label>
        <select
          className="w-full rounded-[var(--radius)] border border-[var(--gray-200)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-[var(--orange)]/20"
          value={form.site_type}
          onChange={update("site_type")}
        >
          {SITE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <TextInput
        label="Site location / address"
        name="address_line"
        placeholder="Syokimau, Mombasa Road"
        value={form.address_line}
        onChange={update("address_line")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="City" name="city" value={form.city} onChange={update("city")} />
        <TextInput label="County" name="county" value={form.county} onChange={update("county")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Start date"
          type="date"
          name="expected_start_date"
          value={form.expected_start_date}
          onChange={update("expected_start_date")}
        />
        <TextInput
          label="Expected completion"
          type="date"
          name="expected_end_date"
          value={form.expected_end_date}
          onChange={update("expected_end_date")}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Description</label>
        <textarea
          className="min-h-[96px] w-full rounded-[var(--radius)] border border-[var(--gray-200)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-[var(--orange)]/20"
          value={form.description}
          onChange={update("description")}
          placeholder="Brief notes about this site…"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
