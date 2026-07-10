import Link from "next/link";
import type { ProjectListItem } from "@/lib/api/types";
import { budgetUtilization, formatKesCompact, projectHealth } from "@/lib/format";

const toneClass = {
  good: "bg-[var(--green-bg)] text-[var(--green)]",
  risk: "bg-[var(--amber-bg)] text-[#a16207]",
  delayed: "bg-[var(--red-bg)] text-[var(--red)]",
};

type ProjectTableProps = {
  projects: ProjectListItem[];
};

export function ProjectTable({ projects }: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--gray-200)] bg-white p-8 text-center">
        <p className="font-semibold text-[var(--navy)]">No projects yet</p>
        <p className="mt-1 text-sm text-[var(--gray-500)]">
          Create your first project to see portfolio progress here.
        </p>
        <Link
          href="/dashboard/projects"
          className="mt-4 inline-flex text-sm font-semibold text-[var(--orange-hover)] hover:underline"
        >
          Go to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--gray-200)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--navy)]">Projects</h2>
        <Link href="/dashboard/projects" className="text-xs font-semibold text-[var(--orange-hover)] hover:underline">
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--gray-50)] text-xs uppercase tracking-wide text-[var(--gray-500)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Progress</th>
              <th className="px-4 py-2.5 font-medium">Budget</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const util = budgetUtilization(project.budget_spent, project.budget_total);
              const health = projectHealth(project.status, project.progress_percent, util);
              return (
                <tr key={project.id} className="border-t border-[var(--gray-100)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--navy)]">{project.name}</p>
                    <p className="text-xs text-[var(--gray-500)]">
                      {[project.site_name, project.site_city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--gray-100)]">
                        <div
                          className="h-full rounded-full bg-[var(--orange)]"
                          style={{ width: `${Math.min(project.progress_percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--gray-600)]">
                        {project.progress_percent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--navy)]">
                      {formatKesCompact(project.budget_total)}
                    </p>
                    <p className="text-xs text-[var(--gray-500)]">{util}% used</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass[health.tone]}`}
                    >
                      {health.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--gray-600)]">
                    {project.planned_end_date
                      ? new Date(project.planned_end_date).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
