import Link from "next/link";
import type { ProjectListItem } from "@/lib/api/types";
import { KpiCard } from "@/components/dashboard/KpiCard";

type Props = {
  firstName: string;
  companyName: string;
  projects: ProjectListItem[];
};

export function ForemanDashboard({ firstName, companyName, projects }: Props) {
  const active = projects.filter((p) => p.status === "active");
  const primary = active[0] ?? projects[0];
  const siteLabel = primary
    ? [primary.site_name, primary.site_city].filter(Boolean).join(", ") || primary.name
    : companyName;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Good day, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--gray-500)]">{siteLabel}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ActionCard
          href="/dashboard/attendance"
          title="Mark attendance"
          description="Record worker check-ins and view who’s on site."
        />
        <ActionCard
          href="/dashboard/inspections"
          title="Report issue"
          description="Flag safety, delays, shortages, or site issues."
        />
        <ActionCard
          href="/dashboard/tasks"
          title="View tasks"
          description="See assigned work and team progress for today."
        />
      </div>

      <section className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--navy)]">Site snapshot</h2>
          {primary ? (
            <span className="rounded-full bg-[var(--green-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--green)]">
              {primary.status === "active" ? "Active" : primary.status}
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Active projects" value={active.length || projects.length} />
          <KpiCard
            label="Avg progress"
            value={`${avgProgress(projects)}%`}
            tone="success"
          />
          <KpiCard label="Sites linked" value={uniqueSites(projects)} />
          <KpiCard
            label="Focus project"
            value={primary ? `${primary.progress_percent}%` : "—"}
            hint={primary?.name}
          />
        </div>
        {primary ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-[var(--gray-500)]">
              <span>{primary.name}</span>
              <span>{primary.progress_percent}% complete</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--gray-100)]">
              <div
                className="h-full rounded-full bg-[var(--orange)]"
                style={{ width: `${Math.min(primary.progress_percent, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--gray-500)]">
            No projects assigned yet. Ask your PM to add you to a site.
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--navy)]">Today&apos;s focus</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--gray-600)]">
            <li>Check attendance before work starts</li>
            <li>Update task progress for your crews</li>
            <li>Log any safety or material issues early</li>
          </ul>
        </section>
        <section className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--navy)]">Safety reminder</h2>
          <p className="mt-2 text-sm text-[var(--gray-600)]">
            PPE on at all times — helmet, boots, vest, gloves, and eye protection where required.
          </p>
          <Link
            href="/dashboard/inspections"
            className="mt-4 inline-flex rounded-lg bg-[var(--navy)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--navy-hover)]"
          >
            Report unsafe condition
          </Link>
        </section>
      </div>
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
      className="rounded-[var(--radius-lg)] bg-[var(--orange)] p-5 text-[var(--orange-ink)] shadow-sm transition hover:bg-[var(--orange-hover)] hover:text-white"
    >
      <h2 className="text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h2>
      <p className="mt-1 text-sm opacity-80">{description}</p>
    </Link>
  );
}

function avgProgress(projects: ProjectListItem[]) {
  if (!projects.length) return 0;
  return Math.round(projects.reduce((s, p) => s + p.progress_percent, 0) / projects.length);
}

function uniqueSites(projects: ProjectListItem[]) {
  return new Set(projects.map((p) => p.site_name || p.id)).size;
}
