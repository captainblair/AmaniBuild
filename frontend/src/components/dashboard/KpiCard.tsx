import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "success";
  children?: ReactNode;
};

const hintTone: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-[var(--gray-500)]",
  warn: "text-[var(--amber)]",
  danger: "text-[var(--red)]",
  success: "text-[var(--green)]",
};

export function KpiCard({ label, value, hint, tone = "default", children }: KpiCardProps) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
      <p
        className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--navy)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {hint ? <p className={`mt-1 text-xs ${hintTone[tone]}`}>{hint}</p> : null}
      {children}
    </article>
  );
}
