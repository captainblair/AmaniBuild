import Image from "next/image";
import Link from "next/link";
import {
  IconBuilding,
  IconChart,
  IconCloud,
  IconCrown,
  IconGift,
  IconHeadset,
  IconShield,
} from "@/components/marketing/MarketingIcons";
import type { SubscriptionPlan } from "@/lib/api/types";

type PricingSectionProps = {
  plans: SubscriptionPlan[];
};

const PLAN_META: Record<
  string,
  {
    Icon: typeof IconGift;
    description: string;
    features: string[];
    limits: string;
    cta: string;
    ctaClass: string;
    footer: string;
    highlighted?: boolean;
  }
> = {
  free: {
    Icon: IconGift,
    description: "Perfect for getting started and exploring AmaniBuild.",
    features: [
      "Up to 1 Active Project",
      "5 Team Members",
      "Tasks and To-Do Lists",
      "Document Management (1GB)",
      "Daily Reports",
      "Mobile App Access",
      "Email Support",
    ],
    limits: "1 Project · 5 Users · 1GB Storage",
    cta: "Get Started Free",
    ctaClass: "wf-pricing-card__cta--outline",
    footer: "No credit card required",
  },
  starter: {
    Icon: IconChart,
    description: "Everything you need to run small projects efficiently.",
    features: [
      "Up to 5 Active Projects",
      "15 Team Members",
      "Tasks and Gantt Charts",
      "Document Management (10GB)",
      "Daily Reports and Site Diaries",
      "Procurement and Inventory",
      "Client and Consultant Access",
      "Email and Chat Support",
    ],
    limits: "5 Projects · 15 Users · 10GB Storage",
    cta: "Start Starter Plan",
    ctaClass: "wf-pricing-card__cta--navy",
    footer: "Cancel anytime",
  },
  professional: {
    Icon: IconCrown,
    description: "Advanced control and insights for growing construction businesses.",
    features: [
      "Unlimited Active Projects",
      "Unlimited Team Members",
      "Advanced Tasks and Scheduling",
      "Document Management (100GB)",
      "Daily Reports and Analytics",
      "Procurement, Inventory and Suppliers",
      "Budgeting and Cost Tracking",
      "Client and Consultant Portals",
      "Priority Support and Onboarding",
    ],
    limits: "Unlimited Projects · Unlimited Users · 100GB Storage",
    cta: "Start Professional Plan",
    ctaClass: "wf-pricing-card__cta--orange",
    footer: "14-day free trial · Cancel anytime",
    highlighted: true,
  },
};

const TRUST_FEATURES = [
  {
    Icon: IconShield,
    title: "Bank-level security",
    text: "Your data is protected with industry-leading security.",
  },
  {
    Icon: IconBuilding,
    title: "Built for Kenya",
    text: "Local compliance, local support, built for how Kenya builds.",
  },
  {
    Icon: IconCloud,
    title: "99.9% uptime",
    text: "Reliable platform so your projects never stop moving.",
  },
  {
    Icon: IconHeadset,
    title: "Real people support",
    text: "Get help from our Kenyan support team when you need it.",
  },
];

const DISPLAY_ORDER = ["free", "starter", "professional"];

function formatPriceDisplay(plan: SubscriptionPlan): { amount: string; period: string } {
  if (plan.code === "enterprise") return { amount: "Custom", period: "" };
  const amount = Number(plan.price_kes_monthly);
  if (amount === 0) return { amount: "KSh 0", period: "/month" };
  return { amount: `KSh ${amount.toLocaleString("en-KE")}`, period: "/month" };
}

export function PricingSection({ plans }: PricingSectionProps) {
  const displayPlans = DISPLAY_ORDER.map((code) => plans.find((plan) => plan.code === code)).filter(
    Boolean,
  ) as SubscriptionPlan[];

  return (
    <section id="pricing" className="wf-pricing">
      <Image
        src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=80&auto=format&fit=crop"
        alt=""
        fill
        className="wf-pricing__bg"
        aria-hidden
      />
      <div className="wf-pricing__overlay" aria-hidden />

      <div className="wf-pricing__inner">
        <div className="wf-pricing__header">
          <p className="mkt-eyebrow">Pricing</p>
          <h2 className="wf-pricing__title">
            Simple, transparent pricing built for construction success
          </h2>
          <p className="wf-pricing__subtitle">
            Start free. Scale with confidence. Pay for what you use.
          </p>
        </div>

        <div className="wf-pricing__cards">
          {displayPlans.map((plan) => {
            const meta = PLAN_META[plan.code];
            if (!meta) return null;

            const { amount, period } = formatPriceDisplay(plan);
            const highlighted = meta.highlighted;

            return (
              <article
                key={plan.code}
                className={`wf-pricing-card${highlighted ? " wf-pricing-card--highlight" : ""}`}
              >
                {highlighted ? (
                  <span className="wf-pricing-card__ribbon">Most popular</span>
                ) : null}

                <div className="wf-pricing-card__icon">
                  <meta.Icon />
                </div>
                <h3 className="wf-pricing-card__name">{plan.name}</h3>
                <p className="wf-pricing-card__desc">{meta.description}</p>

                <div className="wf-pricing-card__price-wrap">
                  <p className="wf-pricing-card__price">{amount}</p>
                  {period ? <p className="wf-pricing-card__period">{period}</p> : null}
                </div>

                <ul className="wf-pricing-card__features">
                  {meta.features.map((feature) => (
                    <li key={feature}>
                      <span className="wf-pricing-card__check" aria-hidden>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="wf-pricing-card__limits">{meta.limits}</div>

                <Link href="/register" className={`wf-pricing-card__cta ${meta.ctaClass}`}>
                  {meta.cta}
                </Link>
                <p className="wf-pricing-card__footer">{meta.footer}</p>
              </article>
            );
          })}
        </div>

        <div className="wf-pricing__trust">
          {TRUST_FEATURES.map(({ Icon, title, text }) => (
            <div key={title} className="wf-pricing-trust">
              <div className="wf-pricing-trust__icon">
                <Icon />
              </div>
              <p className="wf-pricing-trust__title">{title}</p>
              <p className="wf-pricing-trust__text">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
