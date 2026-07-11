import type { ReactNode } from "react";
import Link from "next/link";

type MarketingPageShellProps = {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
};

export function MarketingPageShell({ eyebrow, title, lede, children }: MarketingPageShellProps) {
  return (
    <div className="mkt-page">
      <div className="mkt-page__inner">
        <p className="mkt-page__eyebrow">{eyebrow}</p>
        <h1 className="mkt-page__title">{title}</h1>
        <p className="mkt-page__lede">{lede}</p>
        <div className="mkt-page__body">{children}</div>
        <p className="mkt-page__back">
          <Link href="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
