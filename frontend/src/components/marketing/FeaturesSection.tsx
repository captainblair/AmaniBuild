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
    span: "wide" as const,
  },
  {
    title: "Attendance Tracking",
    description:
      "Track your workforce attendance, working hours and productivity across all sites.",
    Icon: IconAttendance,
    span: "normal" as const,
  },
  {
    title: "Procurement Management",
    description: "Manage vendor quotations, purchase orders and approvals seamlessly.",
    Icon: IconProcurement,
    span: "normal" as const,
  },
  {
    title: "Inventory Control",
    description: "Track materials in real-time, manage stock levels and reduce wastage.",
    Icon: IconInventory,
    span: "normal" as const,
  },
  {
    title: "Reports & Analytics",
    description: "Generate insightful reports and analytics to make data-driven decisions.",
    Icon: IconReports,
    span: "normal" as const,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mkt-features">
      <div className="mkt-features__glow" aria-hidden />

      <div className="mkt-features__inner">
        <div className="mkt-features__top">
          <div className="mkt-features__intro">
            <p className="mkt-eyebrow">Built for construction. Designed for Africa.</p>
            <h2 className="mkt-features__title">
              Everything you need
              <br />
              to run your sites
            </h2>
          </div>
          <p className="mkt-features__lede">
            AmaniBuild brings all your construction operations together in one powerful,
            easy-to-use platform.
          </p>
        </div>

        <div className="mkt-features__bento">
          {FEATURES.map(({ title, description, Icon, span }, index) => (
            <article
              key={title}
              className={`mkt-bento${span === "wide" ? " mkt-bento--wide" : ""}`}
            >
              <span className="mkt-bento__num" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mkt-bento__icon">
                <Icon />
              </div>
              <h3 className="mkt-bento__title">{title}</h3>
              <p className="mkt-bento__text">{description}</p>
              <Link href="/register" className="mkt-bento__link">
                Learn more <span aria-hidden>→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
