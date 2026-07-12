"use client";

import { useEffect, useState } from "react";
import { DefaultDashboard } from "@/components/dashboard/DefaultDashboard";
import { ForemanDashboard } from "@/components/dashboard/ForemanDashboard";
import { PortfolioDashboard } from "@/components/dashboard/PortfolioDashboard";
import { SiteEngineerDashboard } from "@/components/dashboard/SiteEngineerDashboard";
import { WorkerDashboard } from "@/components/dashboard/WorkerDashboard";
import { ClientPortalHome } from "@/components/portal/ClientPortalHome";
import { Spinner } from "@/components/ui/Spinner";
import { fetchProjects } from "@/lib/api/projects";
import { fetchPortfolioAnalytics } from "@/lib/api/reports";
import type { PortfolioAnalytics, ProjectListItem } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { dashboardVariantForRole, firstName, roleLabel } from "@/lib/nav/roles";

export function DashboardHome() {
  const { user, membership } = useDashboardSession();
  const variant = dashboardVariantForRole(membership.role);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (membership.role === "client") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const canViewReports = membership.permissions.includes("view_reports");

      const [projectsResult, analyticsResult] = await Promise.allSettled([
        fetchProjects({ page_size: 12 }),
        canViewReports ? fetchPortfolioAnalytics() : Promise.resolve(null),
      ]);

      if (cancelled) return;

      if (projectsResult.status === "fulfilled") {
        setProjects(projectsResult.value.results);
      } else {
        setProjects([]);
      }

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value);
      } else {
        setAnalytics(null);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [membership.company_id, membership.permissions, membership.role]);

  if (membership.role === "client") {
    return <ClientPortalHome />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  const name = firstName(user.full_name || user.first_name);

  if (variant === "owner") {
    return (
      <PortfolioDashboard
        analytics={analytics}
        projects={projects}
        firstName={name}
        companyName={membership.company_name}
        variant="owner"
      />
    );
  }

  if (variant === "project_manager") {
    return (
      <PortfolioDashboard
        analytics={analytics}
        projects={projects}
        firstName={name}
        companyName={membership.company_name}
        variant="project_manager"
      />
    );
  }

  if (variant === "foreman") {
    return (
      <ForemanDashboard
        firstName={name}
        companyName={membership.company_name}
        projects={projects}
      />
    );
  }

  if (variant === "site_engineer") {
    return (
      <SiteEngineerDashboard
        firstName={name}
        companyName={membership.company_name}
        projects={projects}
      />
    );
  }

  if (variant === "worker") {
    return (
      <WorkerDashboard
        firstName={name}
        companyName={membership.company_name}
        projects={projects}
      />
    );
  }

  return (
    <DefaultDashboard
      firstName={name}
      companyName={membership.company_name}
      roleLabel={roleLabel(membership.role)}
      projects={projects}
    />
  );
}
