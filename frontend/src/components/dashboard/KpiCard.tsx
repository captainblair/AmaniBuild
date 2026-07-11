import type { ReactNode } from "react";

type KpiTone = "default" | "warn" | "danger" | "success";

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
  children?: ReactNode;
};

const toneClass: Record<KpiTone, string> = {
  default: "",
  warn: " dash-kpi--warn",
  danger: " dash-kpi--danger",
  success: " dash-kpi--success",
};

export function KpiCard({ label, value, hint, tone = "default", children }: KpiCardProps) {
  return (
    <article className={`dash-kpi${toneClass[tone]}`}>
      <p className="dash-kpi__label">{label}</p>
      <p className="dash-kpi__value">{value}</p>
      {hint ? <p className="dash-kpi__hint">{hint}</p> : null}
      {children}
    </article>
  );
}
