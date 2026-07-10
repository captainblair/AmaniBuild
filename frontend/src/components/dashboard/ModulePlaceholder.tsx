import Link from "next/link";

type Props = {
  title: string;
  description: string;
  phaseHint?: string;
};

/** Placeholder for modules that land in later FE phases. */
export function ModulePlaceholder({ title, description, phaseHint }: Props) {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange)]">
        Coming soon
      </p>
      <h1
        className="mt-2 text-3xl font-extrabold text-[var(--navy)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      <p className="mt-3 text-[var(--gray-500)]">{description}</p>
      {phaseHint ? <p className="mt-2 text-sm text-[var(--gray-400)]">{phaseHint}</p> : null}
      <Link
        href="/dashboard"
        className="mt-8 inline-flex text-sm font-semibold text-[var(--orange-hover)] hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
