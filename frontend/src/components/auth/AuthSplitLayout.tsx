import type { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";

const AUTH_PHOTO =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=85&auto=format&fit=crop";

type AuthSplitLayoutProps = {
  children: ReactNode;
  headline?: ReactNode;
  subhead?: string;
};

export function AuthSplitLayout({
  children,
  headline = (
    <>
      Build better.{" "}
      <span className="text-[var(--orange)]">Deliver smarter.</span>
    </>
  ),
  subhead = "AmaniBuild helps Kenyan construction teams manage sites, people, materials and progress in one place.",
}: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[var(--navy-deep)] lg:block">
        <Image src={AUTH_PHOTO} alt="" fill className="object-cover opacity-50" priority sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-deep)] via-[var(--navy)]/80 to-black/30" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <Logo variant="light" size="xl" />
          <div className="max-w-md">
            <h1
              className="text-4xl font-extrabold leading-tight tracking-[-0.03em] xl:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {headline}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75">{subhead}</p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orange)] text-[var(--orange-ink)]">
                  ◆
                </span>
                <div>
                  <p className="font-semibold">Real-time site visibility</p>
                  <p className="text-white/60">Diary, attendance and progress in one dashboard.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orange)] text-[var(--orange-ink)]">
                  ◆
                </span>
                <div>
                  <p className="font-semibold">Built for Kenyan teams</p>
                  <p className="text-white/60">Roles, approvals and workflows that match how you build.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orange)] text-[var(--orange-ink)]">
                  ◆
                </span>
                <div>
                  <p className="font-semibold">Enterprise-grade security</p>
                  <p className="text-white/60">Encrypted data, MFA and hosted with local support.</p>
                </div>
              </li>
            </ul>
          </div>
          <p className="text-xs text-white/50">Trusted by construction leaders across Kenya</p>
        </div>
      </aside>

      <main className="flex flex-col bg-[var(--navy-deep)] lg:bg-[var(--bg-light)]">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Logo variant="light" size="xl" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-[460px]">{children}</div>
        </div>
        <p className="px-6 pb-6 text-center text-xs text-white/45 lg:text-[var(--gray-500)]">
          Secure login · 256-bit SSL · Hosted for Kenya
        </p>
      </main>
    </div>
  );
}
