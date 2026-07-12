"use client";

import Link from "next/link";
import type { ProjectListItem } from "@/lib/api/types";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { greetingForNow } from "@/lib/nav/roles";

type Props = {
  firstName: string;
  companyName: string;
  projects: ProjectListItem[];
};

export function WorkerDashboard({ firstName, companyName, projects }: Props) {
  const active = projects.filter((p) => p.status === "active");
  const primary = active[0] ?? projects[0];

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold tracking-[-0.02em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {greetingForNow()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--gray-500)]">
          {primary?.name || companyName} · field shortcuts
        </p>
      </div>

      <OfflineBanner />

      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/dashboard/attendance"
          title="Clock in / out"
          description="Check in with GPS and optional gate code."
        />
        <ActionCard
          href="/dashboard/tasks"
          title="My tasks"
          description="See what you need to finish today."
        />
        <ActionCard
          href="/dashboard/diary"
          title="Site diary"
          description="Capture work notes and photos from the field."
        />
      </div>

      <section className="dash-panel p-5">
        <h2 className="dash-panel__title">Today on site</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <KpiCard label="Active projects" value={active.length || projects.length} />
          <KpiCard
            label="Focus progress"
            value={primary ? `${primary.progress_percent}%` : "—"}
            hint={primary?.name}
            tone="success"
          />
          <KpiCard label="Company" value={companyName.slice(0, 18)} hint="Your employer" />
        </div>
      </section>

      <section className="dash-panel p-4">
        <h2 className="dash-panel__title">Field tips</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--gray-600)]">
          <li>Allow location when clocking so your check-in is verified.</li>
          <li>If signal drops, clock actions queue on this phone and sync later.</li>
          <li>Diary drafts autosave locally until you submit.</li>
        </ul>
      </section>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="dash-panel block p-4 transition hover:border-[rgba(234,179,8,0.45)]"
    >
      <p className="font-semibold text-[var(--navy)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--gray-500)]">{description}</p>
    </Link>
  );
}
