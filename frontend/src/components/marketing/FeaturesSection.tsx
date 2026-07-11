import Link from "next/link";
import {
  IconAttendance,
  IconDiary,
  IconInventory,
  IconProcurement,
  IconReports,
} from "@/components/marketing/MarketingIcons";

const FEATURES = [
  {
    title: "Daily Site Diary",
    description:
      "Capture site activities, progress, challenges and notes in real-time from anywhere.",
    Icon: IconDiary,
  },
  {
    title: "Attendance Tracking",
    description:
      "Track your workforce attendance, working hours and productivity across all sites.",
    Icon: IconAttendance,
  },
  {
    title: "Procurement Management",
    description: "Manage vendor quotations, purchase orders and approvals seamlessly.",
    Icon: IconProcurement,
  },
  {
    title: "Inventory Control",
    description: "Track materials in real-time, manage stock levels and reduce wastage.",
    Icon: IconInventory,
  },
  {
    title: "Reports & Analytics",
    description: "Generate insightful reports and analytics to make data-driven decisions.",
    Icon: IconReports,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mkt-features">
      <div className="mkt-features__deco" aria-hidden>
        <span className="mkt-features__slash" />
        <span className="mkt-features__dot" />
      </div>

      <div className="mkt-features__inner">
        <header className="mkt-features__header">
          <div className="mkt-features__intro">
            <p className="mkt-features__eyebrow">
              <span className="mkt-features__mark" aria-hidden />
              Built for construction. Designed for Africa.
            </p>
            <h2 className="mkt-features__title">
              Everything you need
              <br />
              to run your sites
            </h2>
          </div>
          <p className="mkt-features__lede">
            Five core modules. One workspace. Built for how Kenyan construction teams actually
            work — in the field and in the office.
          </p>
        </header>

        <ol className="mkt-feat-list">
          {FEATURES.map(({ title, description, Icon }, index) => (
            <li key={title} className="mkt-feat">
              <Link href="/register" className="mkt-feat__row">
                <span className="mkt-feat__num" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mkt-feat__icon" aria-hidden>
                  <Icon />
                </span>
                <span className="mkt-feat__copy">
                  <span className="mkt-feat__title">{title}</span>
                  <span className="mkt-feat__text">{description}</span>
                </span>
                <span className="mkt-feat__go" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mkt-features__foot">
          <p>Start free — set up your first site in minutes.</p>
          <Link href="/register" className="mkt-features__cta">
            Get started
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
