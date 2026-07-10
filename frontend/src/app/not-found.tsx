import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--gray-100)] px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--navy)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--gray-600)]">This route will be added in a later frontend phase.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-[var(--orange)] px-4 py-2 text-sm font-medium text-[var(--orange-ink)] hover:opacity-90"
        >
          Back to dev status
        </Link>
      </div>
    </div>
  );
}
