import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-5 shadow-sm ${className}`}>
      {title ? <h2 className="mb-3 text-sm font-semibold text-[var(--navy)]">{title}</h2> : null}
      {children}
    </section>
  );
}
