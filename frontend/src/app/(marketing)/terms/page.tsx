import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";

export const metadata: Metadata = {
  title: "Terms · AmaniBuild",
  description: "Terms of use for the AmaniBuild platform.",
};

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Legal"
      title="Terms of use"
      lede="By creating an AmaniBuild account or using the product, you agree to these terms. A formal agreement will supersede this summary for enterprise contracts."
    >
      <h2>The service</h2>
      <p>
        AmaniBuild provides construction management software for companies and their invited team
        members. Features available to you depend on your subscription plan and role permissions.
      </p>
      <h2>Your responsibilities</h2>
      <p>
        You are responsible for the accuracy of company and site data you submit, for managing
        access for your users, and for complying with applicable Kenyan law when using the
        platform.
      </p>
      <h2>Accounts and billing</h2>
      <p>
        Paid plans renew according to the billing cycle shown at checkout. You can cancel anytime;
        access continues through the end of the paid period unless otherwise stated.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not misuse the service, attempt unauthorized access, or upload unlawful content. We may
        suspend accounts that put the platform or other customers at risk.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:legal@amanibuild.com">legal@amanibuild.com</a>.
      </p>
      <p>Last updated: July 2026.</p>
    </MarketingPageShell>
  );
}
