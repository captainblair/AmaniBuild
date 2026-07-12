"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchProjects } from "@/lib/api/projects";
import {
  fetchGeneratedReport,
  fetchGeneratedReports,
  fetchPortfolioAnalytics,
  fetchProjectAnalytics,
  fetchReportTemplates,
  generateReport,
} from "@/lib/api/reports";
import type {
  GeneratedReport,
  PortfolioAnalytics,
  ProjectListItem,
  ReportTemplate,
  ReportType,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatKesCompact } from "@/lib/format";
import {
  asNumber,
  asRecord,
  asString,
  defaultDateRange,
  formatReportDate,
  formatReportDateTime,
  reportDescription,
  reportTone,
  reportTypeLabel,
} from "@/lib/reports/labels";

const emptyAnalytics: PortfolioAnalytics = {
  total_projects: 0,
  active_projects: 0,
  completed_projects: 0,
  average_progress: 0,
  budget_total: "0",
  budget_spent: "0",
  budget_remaining: "0",
  budget_variance_percent: 0,
  tasks_open: 0,
  tasks_overdue: 0,
  pending_purchase_approvals: 0,
  inventory_low_stock_alerts: 0,
};

type MobileTab = "templates" | "preview" | "recent";

function ProgressRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = (clamped / 100) * 360;
  return (
    <div
      className="rpt-ring"
      style={{ background: `conic-gradient(var(--orange) ${angle}deg, var(--dash-soft, #eef0f3) 0)` }}
      aria-label={`${clamped}% overall progress`}
    >
      <div className="rpt-ring__inner">
        <strong>{clamped}%</strong>
        <span>Progress</span>
      </div>
    </div>
  );
}

function PreviewBody({
  reportType,
  payload,
  projectName,
}: {
  reportType: string;
  payload: Record<string, unknown>;
  projectName?: string | null;
}) {
  if (reportType === "progress") {
    const summary = asRecord(payload.executive_summary);
    const milestones = Array.isArray(payload.milestones) ? payload.milestones : [];
    const progress = asNumber(summary.overall_progress ?? summary.actual_progress);
    return (
      <div className="rpt-preview__body">
        <div className="rpt-preview__hero">
          <ProgressRing value={progress} />
          <ul className="rpt-metrics">
            <li>
              <span>Planned</span>
              <strong>{asNumber(summary.planned_progress)}%</strong>
            </li>
            <li>
              <span>Actual</span>
              <strong>{asNumber(summary.actual_progress)}%</strong>
            </li>
            <li>
              <span>Variance</span>
              <strong>{asNumber(summary.variance_percent)}%</strong>
            </li>
            <li>
              <span>Days remaining</span>
              <strong>{summary.days_remaining == null ? "—" : asString(summary.days_remaining)}</strong>
            </li>
          </ul>
        </div>
        {milestones.length ? (
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Planned</th>
                  <th>Actual</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((row, index) => {
                  const item = asRecord(row);
                  return (
                    <tr key={index}>
                      <td>{asString(item.name)}</td>
                      <td>{asNumber(item.planned_percent)}%</td>
                      <td>{asNumber(item.actual_percent)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  if (reportType === "cost_variance" || reportType === "budget_vs_actual") {
    return (
      <div className="rpt-preview__body">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Budget total" value={formatKesCompact(asString(payload.budget_total, "0"))} />
          <KpiCard label="Spent" value={formatKesCompact(asString(payload.budget_spent, "0"))} />
          <KpiCard label="Remaining" value={formatKesCompact(asString(payload.budget_remaining, "0"))} />
          <KpiCard
            label="Utilization"
            value={`${asNumber(payload.budget_utilization_percent)}%`}
            tone={asNumber(payload.budget_utilization_percent) > 90 ? "warn" : "default"}
          />
        </div>
        <p className="rpt-note">
          Approved procurement: {formatKesCompact(asString(payload.approved_procurement_total, "0"))}
          {projectName ? ` · ${projectName}` : ""}
        </p>
      </div>
    );
  }

  if (reportType === "attendance_payroll") {
    const attendance = asRecord(payload.attendance);
    return (
      <div className="rpt-preview__body">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Active workers" value={asNumber(payload.active_workers)} />
          <KpiCard label="Present days" value={asNumber(attendance.present_days ?? attendance.present)} />
          <KpiCard label="Absent days" value={asNumber(attendance.absent_days ?? attendance.absent)} />
          <KpiCard label="Late days" value={asNumber(attendance.late_days ?? attendance.late)} />
        </div>
      </div>
    );
  }

  if (reportType === "material_usage") {
    const inventory = asRecord(payload.inventory);
    const movements = Array.isArray(payload.movement_totals) ? payload.movement_totals : [];
    return (
      <div className="rpt-preview__body">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Materials" value={asNumber(inventory.total_materials)} />
          <KpiCard
            label="Low stock alerts"
            value={asNumber(inventory.low_stock_alerts)}
            tone={asNumber(inventory.low_stock_alerts) ? "danger" : "default"}
          />
        </div>
        {movements.length ? (
          <ul className="rpt-list">
            {movements.map((row, index) => {
              const item = asRecord(row);
              return (
                <li key={index}>
                  <strong>{asString(item.movement_type).replace(/_/g, " ")}</strong>
                  <span>{asString(item.total)}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  if (reportType === "diary_summary") {
    const insights = asRecord(payload.insights);
    return (
      <div className="rpt-preview__body">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Entries" value={asNumber(payload.entries_count)} />
          <KpiCard label="Issues reported" value={asNumber(payload.issues_reported)} tone="warn" />
          <KpiCard label="Approved entries" value={asNumber(insights.approved_entries)} />
          <KpiCard label="Pending entries" value={asNumber(insights.pending_entries)} />
        </div>
      </div>
    );
  }

  if (reportType === "safety_incidents") {
    const incidents = Array.isArray(payload.incidents) ? payload.incidents : [];
    return (
      <div className="rpt-preview__body">
        <KpiCard label="Incidents" value={asNumber(payload.count)} tone={asNumber(payload.count) ? "danger" : "success"} />
        <ul className="rpt-list">
          {incidents.map((row, index) => {
            const item = asRecord(row);
            return (
              <li key={index}>
                <strong>{formatReportDate(typeof item.entry_date === "string" ? item.entry_date : null)}</strong>
                <span>{asString(item.safety_concerns)}</span>
              </li>
            );
          })}
          {!incidents.length ? <li className="rpt-empty-row">No safety incidents in this range.</li> : null}
        </ul>
      </div>
    );
  }

  if (reportType === "custom") {
    const counts = asRecord(payload.task_counts);
    return (
      <div className="rpt-preview__body">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="All tasks" value={asNumber(counts.all)} />
          <KpiCard label="To do" value={asNumber(counts.todo)} />
          <KpiCard label="In progress" value={asNumber(counts.in_progress)} />
          <KpiCard label="Done" value={asNumber(counts.done)} />
          <KpiCard label="High priority" value={asNumber(payload.high_priority_tasks)} tone="warn" />
        </div>
      </div>
    );
  }

  // Portfolio snapshot or unknown payload
  return (
    <div className="rpt-preview__body">
      <div className="grid gap-3 sm:grid-cols-2">
        {"total_projects" in payload ? (
          <>
            <KpiCard label="Projects" value={asNumber(payload.total_projects)} />
            <KpiCard label="Active" value={asNumber(payload.active_projects)} />
            <KpiCard label="Avg progress" value={`${asNumber(payload.average_progress)}%`} />
            <KpiCard label="Budget remaining" value={formatKesCompact(asString(payload.budget_remaining, "0"))} />
          </>
        ) : (
          <pre className="rpt-json">{JSON.stringify(payload, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { membership } = useDashboardSession();
  const canView = membership.permissions.includes("view_reports");

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics>(emptyAnalytics);
  const [recent, setRecent] = useState<GeneratedReport[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType>("progress");
  const [projectId, setProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultDateRange().from);
  const [dateTo, setDateTo] = useState(defaultDateRange().to);
  const [previewTitle, setPreviewTitle] = useState("Progress Report");
  const [previewPayload, setPreviewPayload] = useState<Record<string, unknown> | null>(null);
  const [previewProjectName, setPreviewProjectName] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("templates");

  const loadHub = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view reports.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [templateList, portfolio, generated, projectList] = await Promise.all([
        fetchReportTemplates(),
        fetchPortfolioAnalytics(),
        fetchGeneratedReports({ page_size: 8 }),
        fetchProjects({ page_size: 100, ordering: "name" }),
      ]);
      setTemplates(templateList);
      setAnalytics(portfolio);
      setRecent(generated.results);
      setProjects(projectList.results);
      if (!projectId && projectList.results[0]) setProjectId(projectList.results[0].id);
      if (templateList[0] && !selectedType) setSelectedType(templateList[0].report_type);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load reports hub.");
    } finally {
      setLoading(false);
    }
  }, [canView, projectId, selectedType]);

  useEffect(() => {
    void loadHub();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial hub load only
  }, [canView]);

  const selectedLabel = useMemo(
    () => reportTypeLabel(selectedType, templates),
    [selectedType, templates],
  );

  async function loadLivePreview(type: ReportType = selectedType, project = projectId) {
    setPreviewLoading(true);
    setError(null);
    setSelectedReportId(null);
    try {
      if (!project) {
        const portfolio = await fetchPortfolioAnalytics();
        setPreviewPayload(portfolio as unknown as Record<string, unknown>);
        setPreviewTitle(`${reportTypeLabel(type, templates)} — Portfolio`);
        setPreviewProjectName(null);
        return;
      }
      const data = await fetchProjectAnalytics(project, {
        report_type: type,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setPreviewPayload(data.analytics);
      setPreviewTitle(`${reportTypeLabel(type, templates)} — ${data.project.name}`);
      setPreviewProjectName(data.project.name);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load preview.");
      setPreviewPayload(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (!canView || loading) return;
    void loadLivePreview(selectedType, projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when filters change
  }, [selectedType, projectId, dateFrom, dateTo, canView, loading]);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const report = await generateReport({
        report_type: selectedType,
        title: projectId
          ? `${selectedLabel} — ${projects.find((p) => p.id === projectId)?.name ?? "Project"}`
          : `${selectedLabel} — Portfolio`,
        project_id: projectId || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        output_format: "json",
      });
      setRecent((prev) => [report, ...prev.filter((r) => r.id !== report.id)].slice(0, 8));
      setSelectedReportId(report.id);
      setPreviewPayload(report.payload);
      setPreviewTitle(report.title);
      setPreviewProjectName(report.project_name);
      setMobileTab("preview");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not generate report.");
    } finally {
      setGenerating(false);
    }
  }

  async function openSavedReport(id: string) {
    setPreviewLoading(true);
    setError(null);
    try {
      const report = await fetchGeneratedReport(id);
      setSelectedReportId(report.id);
      setSelectedType(report.report_type);
      setPreviewPayload(report.payload);
      setPreviewTitle(report.title);
      setPreviewProjectName(report.project_name);
      if (report.project) setProjectId(report.project);
      if (report.date_from) setDateFrom(report.date_from);
      if (report.date_to) setDateTo(report.date_to);
      setMobileTab("preview");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not open report.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function downloadJson() {
    if (!previewPayload) return;
    const blob = new Blob([JSON.stringify({ title: previewTitle, payload: previewPayload }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewTitle.replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!canView) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">You do not have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="rpt-page">
      <div>
        <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
          Reports & Analytics Hub
        </h1>
        <p className="mt-1 text-sm text-[var(--gray-500)]">
          Generate and analyze project reports with real-time insights.
        </p>
      </div>

      {error ? <p className="rpt-error">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading reports…" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Active projects" value={analytics.active_projects} />
            <KpiCard label="Avg progress" value={`${analytics.average_progress}%`} />
            <KpiCard label="Budget remaining" value={formatKesCompact(analytics.budget_remaining)} />
            <KpiCard
              label="Alerts"
              value={analytics.tasks_overdue + analytics.inventory_low_stock_alerts}
              tone={
                analytics.tasks_overdue + analytics.inventory_low_stock_alerts > 0 ? "warn" : "default"
              }
              hint={`${analytics.tasks_overdue} overdue · ${analytics.inventory_low_stock_alerts} low stock`}
            />
          </div>

          <div className="rpt-mobile-tabs lg:hidden">
            {(
              [
                ["templates", "Templates"],
                ["preview", "Preview"],
                ["recent", "Recent"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={mobileTab === id ? "is-active" : ""}
                onClick={() => setMobileTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rpt-shell">
            <section className={`rpt-templates ${mobileTab === "templates" ? "is-mobile-open" : ""}`}>
              <div className="rpt-section-head">
                <h2>Report templates</h2>
              </div>
              <div className="rpt-template-grid">
                {templates.map((template) => {
                  const tone = reportTone(template.report_type);
                  const active = selectedType === template.report_type;
                  const last = recent.find((r) => r.report_type === template.report_type);
                  return (
                    <article
                      key={template.report_type}
                      className={`rpt-template rpt-template--${tone} ${active ? "is-active" : ""}`}
                    >
                      <div className="rpt-template__icon" aria-hidden>
                        {template.label.slice(0, 1)}
                      </div>
                      <h3>{template.label}</h3>
                      <p>{reportDescription(template.report_type)}</p>
                      <span className="rpt-template__meta">
                        {last ? `Last generated ${formatReportDateTime(last.created_at)}` : "Not generated yet"}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedType(template.report_type);
                          setMobileTab("preview");
                        }}
                      >
                        Generate
                      </Button>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className={`rpt-preview dash-panel ${mobileTab === "preview" ? "is-mobile-open" : ""}`}>
              <div className="rpt-section-head">
                <div>
                  <h2>Selected report preview</h2>
                  <p className="rpt-subtitle">{previewTitle}</p>
                </div>
                {selectedReportId ? <span className="rpt-pill">Saved</span> : <span className="rpt-pill rpt-pill--draft">Live</span>}
              </div>

              <div className="rpt-controls">
                <label>
                  <span>Project</span>
                  <select className="rpt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">Portfolio overview</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    className="rpt-select"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="date"
                    className="rpt-select"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              </div>

              {previewLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner label="Loading preview…" />
                </div>
              ) : previewPayload ? (
                <PreviewBody
                  reportType={selectedType}
                  payload={previewPayload}
                  projectName={previewProjectName}
                />
              ) : (
                <p className="rpt-empty">Select a template and project to preview analytics.</p>
              )}

              <div className="rpt-actions">
                <Button type="button" disabled={generating || !previewPayload} onClick={() => void onGenerate()}>
                  {generating ? "Generating…" : "Save report"}
                </Button>
                <Button type="button" variant="outline" disabled={!previewPayload} onClick={downloadJson}>
                  Download JSON
                </Button>
              </div>
            </section>

            <aside className={`rpt-recent dash-panel ${mobileTab === "recent" ? "is-mobile-open" : ""}`}>
              <div className="rpt-section-head">
                <h2>Recent reports</h2>
              </div>
              {recent.length === 0 ? (
                <p className="rpt-empty">No generated reports yet.</p>
              ) : (
                <ul className="rpt-recent-list">
                  {recent.map((report) => (
                    <li key={report.id}>
                      <button
                        type="button"
                        className={`rpt-recent-item ${selectedReportId === report.id ? "is-active" : ""}`}
                        onClick={() => void openSavedReport(report.id)}
                      >
                        <strong>{report.title}</strong>
                        <span>
                          {reportTypeLabel(report.report_type, templates)} · {formatReportDateTime(report.created_at)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
