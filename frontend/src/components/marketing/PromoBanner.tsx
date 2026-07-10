import Link from "next/link";

export function PromoBanner() {
  return (
    <div className="wf-promo">
      <div className="wf-promo__message">
        AmaniBuild is now live! Simplify site management, boost profitability, and build with
        confidence.
      </div>
      <Link href="/register" className="wf-promo__cta">
        Request a demo →
      </Link>
    </div>
  );
}
