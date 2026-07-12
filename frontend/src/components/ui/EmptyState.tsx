"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="dash-empty">
      <p className="dash-empty__title">{title}</p>
      {description ? <p className="dash-empty__text">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PermissionDenied({ message = "You do not have permission to view this page." }: { message?: string }) {
  return (
    <div className="dash-panel p-8 text-center">
      <p className="text-sm text-[var(--gray-500)]">{message}</p>
      <Link href="/dashboard" className="dash-empty__link mt-3 inline-block">
        Back to dashboard
      </Link>
    </div>
  );
}
