import { Logo } from "@/components/ui/Logo";

export const ONBOARDING_STEPS = [
  { key: "company", label: "Company", hint: "Tell us about your business" },
  { key: "site", label: "Site", hint: "Add your first project site" },
  { key: "invite", label: "Invite Team", hint: "Add your team members" },
  { key: "review", label: "Review", hint: "Confirm and finish" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

type OnboardingShellProps = {
  activeStep: OnboardingStepKey;
  children: React.ReactNode;
  sidePanel?: React.ReactNode;
};

export function OnboardingShell({ activeStep, children, sidePanel }: OnboardingShellProps) {
  const activeIndex = ONBOARDING_STEPS.findIndex((step) => step.key === activeStep);

  return (
    <div className="flex min-h-screen bg-[var(--bg-light)]">
      <aside className="hidden w-[280px] shrink-0 flex-col bg-[var(--navy)] px-6 py-8 text-white lg:flex">
        <Logo variant="light" size="lg" />
        <nav className="mt-10 flex-1 space-y-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <div
                key={step.key}
                className={`flex gap-3 rounded-xl px-3 py-3 ${
                  active ? "bg-white/10" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-[var(--green)] text-white"
                      : active
                        ? "bg-[var(--orange)] text-[var(--orange-ink)]"
                        : "bg-white/10 text-white/50"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-white" : "text-white/70"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-white/45">{step.hint}</p>
                </div>
              </div>
            );
          })}
        </nav>
        <p className="text-xs text-white/40">Your data is secure and encrypted</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--gray-200)] bg-white px-4 py-4 lg:hidden">
          <Logo size="lg" />
          <div className="mt-4 flex gap-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.key}
                className={`h-1.5 flex-1 rounded-full ${
                  index <= activeIndex ? "bg-[var(--orange)]" : "bg-[var(--gray-200)]"
                }`}
              />
            ))}
          </div>
        </header>

        <main className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</div>
          {sidePanel ? (
            <aside className="hidden w-[340px] shrink-0 border-l border-[var(--gray-200)] bg-white p-6 xl:block">
              {sidePanel}
            </aside>
          ) : null}
        </main>
      </div>
    </div>
  );
}
