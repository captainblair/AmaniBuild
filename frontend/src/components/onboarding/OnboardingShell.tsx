import Image from "next/image";
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
    <div className="ob-shell">
      <aside className="ob-rail">
        <div className="ob-rail__visual" aria-hidden>
          <Image
            src="/marketing/home2.avif"
            alt=""
            fill
            className="ob-rail__photo"
            sizes="340px"
            priority
          />
          <div className="ob-rail__scrim" />
          <div className="ob-rail__stripes" />
          <div className="ob-rail__block ob-rail__block--yellow" />
          <div className="ob-rail__block ob-rail__block--red" />
        </div>

        <div className="ob-rail__content">
          <Logo variant="light" size="lg" href="/" />

          <div className="ob-rail__intro">
            <p className="ob-rail__eyebrow">
              <span className="ob-rail__mark" aria-hidden />
              Setup
            </p>
            <h2 className="ob-rail__headline">
              Build the
              <br />
              foundation
            </h2>
            <p className="ob-rail__copy">
              Four steps. One workspace. Ready for Kenyan construction teams.
            </p>
          </div>

          <nav className="ob-steps" aria-label="Onboarding progress">
            {ONBOARDING_STEPS.map((step, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              return (
                <div
                  key={step.key}
                  className={`ob-step${active ? " is-active" : ""}${done ? " is-done" : ""}`}
                >
                  <div className="ob-step__track" aria-hidden>
                    <span className="ob-step__dot">
                      {done ? "✓" : String(index + 1).padStart(2, "0")}
                    </span>
                    {index < ONBOARDING_STEPS.length - 1 ? (
                      <span className="ob-step__line" />
                    ) : null}
                  </div>
                  <div className="ob-step__copy">
                    <p className="ob-step__label">{step.label}</p>
                    <p className="ob-step__hint">{step.hint}</p>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="ob-rail__footer">
            <span className="ob-rail__hazard" aria-hidden />
            <p className="ob-rail__secure">Secure · Encrypted · Kenya-ready</p>
          </div>
        </div>
      </aside>

      <div className="ob-main">
        <div className="ob-main__graphic" aria-hidden>
          <span className="ob-main__slash" />
          <span className="ob-main__dot" />
          <span className="ob-main__rule" />
        </div>

        <header className="ob-mobile-bar">
          <Logo variant="dark" size="md" href="/" />
          <div className="ob-mobile-progress" aria-hidden>
            {ONBOARDING_STEPS.map((step, index) => (
              <span
                key={step.key}
                className={`ob-mobile-progress__seg${index <= activeIndex ? " is-on" : ""}${index === activeIndex ? " is-now" : ""}`}
              />
            ))}
          </div>
        </header>

        <div className="ob-main__body">
          <div className="ob-main__form">
            <div className="ob-form-panel">
              <p className="ob-form-panel__stamp" aria-hidden>
                {String(activeIndex + 1).padStart(2, "0")}
                <span>/04</span>
              </p>
              {children}
            </div>
          </div>
          {sidePanel ? <aside className="ob-aside">{sidePanel}</aside> : null}
        </div>
      </div>
    </div>
  );
}
