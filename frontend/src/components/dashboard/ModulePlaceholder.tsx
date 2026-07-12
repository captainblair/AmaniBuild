import Link from "next/link";

type Props = {
  title: string;
  description: string;
  phaseHint?: string;
};

/** Placeholder for modules that land in later FE phases. */
export function ModulePlaceholder({ title, description, phaseHint }: Props) {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="dash-panel px-8 py-10">
        <p className="text-sm font-medium text-[var(--gray-500)]">Coming soon</p>
        <h1
          className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[var(--navy)] md:text-[1.75rem]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--gray-500)]">{description}</p>
        {phaseHint ? <p className="mt-2 text-sm text-[var(--gray-400)]">{phaseHint}</p> : null}
        <Link href="/dashboard" className="dash-empty__link mt-8">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
