import type { ReactNode } from "react";

export function AuthCard({
  children,
  title,
  subtitle,
  icon,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-7 shadow-[0_24px_60px_rgba(17,24,39,0.14)] sm:p-9">
      {icon ? <div className="mb-4 text-[var(--orange)]">{icon}</div> : null}
      <h1
        className="text-[1.75rem] font-extrabold tracking-[-0.03em] text-[var(--navy)] sm:text-3xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--gray-500)]">{subtitle}</p>
      ) : null}
      <div className="mt-7">{children}</div>
    </div>
  );
}
