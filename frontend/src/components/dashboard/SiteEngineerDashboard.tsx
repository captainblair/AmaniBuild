import Link from "next/link";
import type { ProjectListItem } from "@/lib/api/types";
import { KpiCard } from "@/components/dashboard/KpiCard";

type Props = {
  firstName: string;
  companyName: string;
  projects: ProjectListItem[];
};

export function SiteEngineerDashboard({ firstName, companyName, projects }: Props) {
  const primary = projects.find((p) => p.status === "active") ?? projects[0];
  const daysLeft =
    primary?.planned_end_date != null
      ? Math.ceil(
          (new Date(primary.planned_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-extrabold text-[var(--navy)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Daily overview, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            {primary
              ? [primary.name, primary.site_city].filter(Boolean).join(" · ")
              : companyName}
          </p>
        </div>
        {primary ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs text-[var(--gray-500)]">Project progress</p>
            <p className="text-xl font-extrabold text-[var(--navy)]">{primary.progress_percent}%</p>
            {daysLeft != null ? (
              <p className="text-xs text-[var(--gray-500)]">
                {daysLeft >= 0 ? `${daysLeft} days to target` : `${Math.abs(daysLeft)} days past target`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active projects" value={projects.filter((p) => p.status === "active").length} />
        <KpiCard label="Open projects" value={projects.length} />
        <KpiCard
          label="Avg completion"
          value={`${avgProgress(projects)}%`}
          tone="success"
        />
        <KpiCard
          label="Focus site"
          value={primary?.site_name ?? "—"}
          hint={primary?.name}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-[var(--navy)]">Today&apos;s checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--gray-600)]">
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-300)]" />
              Review open inspections
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-300)]" />
              Update daily site diary
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-300)]" />
              Confirm material deliveries
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-300)]" />
              Sync task progress with crews
            </li>
          </ul>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-[var(--navy)]">Quick actions</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <QuickAction href="/dashboard/diary" label="Daily diary" />
            <QuickAction href="/dashboard/inspections" label="Inspection" />
            <QuickAction href="/dashboard/tasks" label="Tasks" />
            <QuickAction href="/dashboard/inventory" label="Materials" />
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--navy)]">Projects on your radar</h2>
          <ul className="mt-3 space-y-2">
            {projects.slice(0, 4).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-[var(--navy)]">{p.name}</span>
                <span className="shrink-0 text-xs text-[var(--gray-500)]">{p.progress_percent}%</span>
              </li>
            ))}
            {projects.length === 0 ? (
              <li className="text-sm text-[var(--gray-500)]">No projects yet.</li>
            ) : null}
          </ul>
          <Link
            href="/dashboard/projects"
            className="mt-3 inline-block text-xs font-semibold text-[var(--orange-hover)] hover:underline"
          >
            Open projects
          </Link>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-[var(--navy)] px-3 py-3 text-center text-xs font-semibold text-white hover:bg-[var(--navy-hover)]"
    >
      {label}
    </Link>
  );
}

function avgProgress(projects: ProjectListItem[]) {
  if (!projects.length) return 0;
  return Math.round(projects.reduce((s, p) => s + p.progress_percent, 0) / projects.length);
}
