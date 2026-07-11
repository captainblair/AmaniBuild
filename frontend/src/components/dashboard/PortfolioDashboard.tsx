import Link from "next/link";
import type { PortfolioAnalytics, ProjectListItem } from "@/lib/api/types";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ProjectTable } from "@/components/dashboard/ProjectTable";
import { budgetUtilization, formatKesCompact } from "@/lib/format";

type Props = {
  analytics: PortfolioAnalytics | null;
  projects: ProjectListItem[];
  firstName: string;
  companyName: string;
  variant: "owner" | "project_manager";
};

export function PortfolioDashboard({ analytics, projects, firstName, companyName, variant }: Props) {
  const util = analytics
    ? budgetUtilization(analytics.budget_spent, analytics.budget_total)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--orange-hover)]">
          {variant === "owner" ? "Owner portfolio" : "Delivery snapshot"}
        </p>
        <h1
          className="mt-1.5 text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--navy)] md:text-[2rem]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {variant === "owner" ? `Good day, ${firstName}` : `Welcome back, ${firstName}`}
        </h1>
        <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-[var(--gray-600)]">
          {variant === "owner"
            ? `Portfolio overview for ${companyName}.`
            : `Project delivery snapshot for ${companyName}.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active projects"
          value={analytics?.active_projects ?? projects.filter((p) => p.status === "active").length}
          hint={
            analytics
              ? `${analytics.total_projects} total · ${analytics.completed_projects} completed`
              : "From your project list"
          }
        />
        <KpiCard
          label="Budget utilization"
          value={`${util}%`}
          hint={
            analytics
              ? `${formatKesCompact(analytics.budget_spent)} of ${formatKesCompact(analytics.budget_total)}`
              : "Connect reports for live spend"
          }
        />
        <KpiCard
          label="Overall progress"
          value={`${analytics?.average_progress ?? avgProgress(projects)}%`}
          hint="Average across projects"
          tone="success"
        />
        <KpiCard
          label={variant === "owner" ? "Open risks" : "Open tasks"}
          value={
            variant === "owner"
              ? (analytics?.inventory_low_stock_alerts ?? 0) + (analytics?.tasks_overdue ?? 0)
              : (analytics?.tasks_open ?? 0)
          }
          hint={
            variant === "owner"
              ? `${analytics?.tasks_overdue ?? 0} overdue tasks · ${analytics?.inventory_low_stock_alerts ?? 0} stock alerts`
              : `${analytics?.tasks_overdue ?? 0} overdue · ${analytics?.pending_purchase_approvals ?? 0} PRs pending`
          }
          tone={(analytics?.tasks_overdue ?? 0) > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <ProjectTable projects={projects.slice(0, 6)} />
        <aside className="space-y-4">
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Quick actions</h2>
            <div className="mt-3 grid gap-2">
              <Link href="/dashboard/projects" className="dash-quick-link">
                Open projects
              </Link>
              <Link href="/dashboard/diary" className="dash-quick-link">
                Site diary
              </Link>
              <Link href="/dashboard/reports" className="dash-quick-link">
                Reports hub
              </Link>
              <Link href="/dashboard/procurement" className="dash-quick-link">
                Procurement
              </Link>
            </div>
          </section>
          <section className="dash-panel p-4">
            <h2 className="dash-panel__title">Attention</h2>
            <ul className="dash-attention mt-3 space-y-2.5 text-sm text-[var(--gray-600)]">
              <li>
                {analytics?.pending_purchase_approvals ?? 0} purchase requests awaiting approval
              </li>
              <li>{analytics?.inventory_low_stock_alerts ?? 0} low-stock inventory alerts</li>
              <li>{analytics?.tasks_overdue ?? 0} overdue tasks across sites</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function avgProgress(projects: ProjectListItem[]) {
  if (!projects.length) return 0;
  return Math.round(
    projects.reduce((sum, p) => sum + p.progress_percent, 0) / projects.length,
  );
}
