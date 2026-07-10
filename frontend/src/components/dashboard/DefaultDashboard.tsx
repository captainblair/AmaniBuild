import Link from "next/link";
import type { ProjectListItem } from "@/lib/api/types";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ProjectTable } from "@/components/dashboard/ProjectTable";

type Props = {
  firstName: string;
  companyName: string;
  roleLabel: string;
  projects: ProjectListItem[];
};

export function DefaultDashboard({ firstName, companyName, roleLabel, projects }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--gray-500)]">
          {roleLabel} · {companyName}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Projects" value={projects.length} />
        <KpiCard
          label="Active"
          value={projects.filter((p) => p.status === "active").length}
        />
        <KpiCard
          label="Avg progress"
          value={`${
            projects.length
              ? Math.round(projects.reduce((s, p) => s + p.progress_percent, 0) / projects.length)
              : 0
          }%`}
        />
      </div>
      <ProjectTable projects={projects.slice(0, 5)} />
      <p className="text-sm text-[var(--gray-500)]">
        Need something else?{" "}
        <Link href="/dashboard/help" className="font-semibold text-[var(--orange-hover)] hover:underline">
          Help & support
        </Link>
      </p>
    </div>
  );
}
