"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { upgradeHref } from "@/lib/api/plans";

type Props = {
  message: string;
  reason?: "plan_project_limit" | "plan_user_limit" | string;
  nextPath?: string;
  className?: string;
};

export function PlanLimitNotice({
  message,
  reason = "plan_project_limit",
  nextPath,
  className = "",
}: Props) {
  const href = upgradeHref({ reason, next: nextPath });

  return (
    <div className={`plan-limit-notice ${className}`.trim()} role="alert">
      <p className="plan-limit-notice__msg">{message}</p>
      <div className="plan-limit-notice__actions">
        <Button href={href} size="sm">
          Proceed to upgrade
        </Button>
        <Link href={href} className="plan-limit-notice__link">
          Compare plans
        </Link>
      </div>
    </div>
  );
}
