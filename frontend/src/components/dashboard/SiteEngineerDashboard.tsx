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
            className="text-2xl font-semibold tracking-[-0.02em] text-[var(--navy)]"
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
          <div className="dash-panel px-4 py-3 text-right">
            <p className="text-xs text-[var(--gray-500)]">Project progress</p>
            <p className="text-xl font-semibold tracking-[-0.02em] text-[var(--navy)]">
              {primary.progress_percent}%
            </p>
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
        <section className="dash-panel p-4 lg:col-span-1">
          <h2 className="dash-panel__title">Today&apos;s checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--gray-600)]">
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-200)] bg-[var(--gray-50)]" />
              Review open inspections
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-200)] bg-[var(--gray-50)]" />
              Update daily site diary
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-200)] bg-[var(--gray-50)]" />
              Confirm material deliveries
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 rounded border border-[var(--gray-200)] bg-[var(--gray-50)]" />
              Sync task progress with crews
            </li>
          </ul>
        </section>

        <section className="dash-panel p-4 lg:col-span-1">
          <h2 className="dash-panel__title">Quick actions</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/dashboard/diary" className="dash-quick-link text-center">
              Daily diary
            </Link>
            <Link href="/dashboard/inspections" className="dash-quick-link text-center">
              Inspection
            </Link>
            <Link href="/dashboard/tasks" className="dash-quick-link text-center">
              Tasks
            </Link>
            <Link href="/dashboard/inventory" className="dash-quick-link text-center">
              Materials
            </Link>
          </div>
        </section>

        <section className="dash-panel p-4">
          <h2 className="dash-panel__title">Projects on your radar</h2>
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
            className="mt-3 inline-block text-xs font-medium text-[var(--gray-500)] hover:text-[var(--navy)]"
          >
            Open projects →
          </Link>
        </section>
      </div>
    </div>
  );
}

function avgProgress(projects: ProjectListItem[]) {
  if (!projects.length) return 0;
  return Math.round(projects.reduce((s, p) => s + p.progress_percent, 0) / projects.length);
}
