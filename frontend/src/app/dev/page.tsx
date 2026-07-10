import Link from "next/link";
import { ConnectionStatus } from "@/components/dev/ConnectionStatus";
import { Logo } from "@/components/ui/Logo";
import { getApiBaseUrl } from "@/lib/api/config";

export const metadata = {
  title: "Dev status | AmaniBuild",
};

export default function DevStatusPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-light)]">
      <header className="border-b border-[var(--gray-200)] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo size="lg" />
          <div className="flex gap-3 text-sm">
            <Link href="/" className="text-[var(--gray-500)] hover:text-[var(--navy)]">
              Marketing
            </Link>
            <Link href="/dashboard" className="font-medium text-[var(--orange-hover)] hover:underline">
              Dashboard
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--orange)]">
            Developer tools
          </p>
          <h1 className="text-2xl font-bold text-[var(--navy)]">AmaniBuild dev status</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--gray-600)]">
            Verifies the frontend can reach the Django API.
          </p>
        </header>

        <ConnectionStatus />

        <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--navy)]">FE Phase 4</h2>
          <ul className="grid gap-2 text-sm text-[var(--gray-600)] md:grid-cols-2">
            <li>Dashboard shell with role-filtered sidebar</li>
            <li>Auth + onboarding gate on /dashboard</li>
            <li>Owner / PM / foreman / site engineer homes</li>
            <li>Portfolio analytics + projects list KPIs</li>
          </ul>
          <p className="mt-4 text-xs text-[var(--gray-500)]">
            API base URL: <code>{getApiBaseUrl()}</code>
          </p>
        </section>
      </div>
    </div>
  );
}
