"use client";

import Link from "next/link";
import { useDashboardSession } from "@/lib/auth/session";

const FAQS = [
  {
    q: "How do I clock in on site?",
    a: "Open Attendance from the bottom nav (Clock). Select your project, optionally paste a check-in point code, then tap Check in. GPS is attached when your phone allows location.",
  },
  {
    q: "Where do I write the daily site diary?",
    a: "Go to Site Diary, pick a project, and create a draft. Photos can be attached from the form. Drafts autosave on this device if you lose signal.",
  },
  {
    q: "How do clients see progress?",
    a: "Invite someone with the Client role, then grant them portal access on the project detail page. They get a read-only progress view.",
  },
  {
    q: "Who can approve purchases or expenses?",
    a: "Procurement and expense approvals follow your company role permissions. Owners and managers typically approve; workers can submit drafts.",
  },
];

export function HelpPage() {
  const { membership } = useDashboardSession();

  return (
    <div className="help-page">
      <header>
        <p className="team-eyebrow">Support</p>
        <h1 className="team-title">Help & Support</h1>
        <p className="team-sub">
          Quick answers for field and office teams at {membership.company_name}.
        </p>
      </header>

      <section className="dash-panel p-5">
        <h2 className="dash-panel__title">Contact</h2>
        <p className="mt-2 text-sm text-[var(--gray-600)]">
          For account or billing issues, email{" "}
          <a className="font-semibold text-[var(--navy)] underline" href="mailto:support@amanibuild.co.ke">
            support@amanibuild.co.ke
          </a>
          . For site questions, message your project manager inside AmaniBuild.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/dashboard/messages" className="dash-empty__link">
            Open messages
          </Link>
          <Link href="/dashboard/notifications" className="dash-empty__link">
            Notifications
          </Link>
        </div>
      </section>

      <section>
        <h2 className="dash-panel__title mb-3">FAQ</h2>
        <div className="help-faq">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {membership.role === "client" ? (
        <section className="dash-panel p-5">
          <h2 className="dash-panel__title">Client portal tips</h2>
          <p className="mt-2 text-sm text-[var(--gray-600)]">
            Your home screen lists projects shared with you. Open a project for progress, photos, and
            approved site updates. Budget appears only when the contractor enables it.
          </p>
          <Link href="/dashboard" className="dash-empty__link mt-3 inline-block">
            Back to portal
          </Link>
        </section>
      ) : null}
    </div>
  );
}
