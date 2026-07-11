import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";

export const metadata: Metadata = {
  title: "Privacy · AmaniBuild",
  description: "How AmaniBuild collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Legal"
      title="Privacy policy"
      lede="This summary explains how AmaniBuild handles account and site data. A full legal policy will replace this as we formalize compliance."
    >
      <h2>What we collect</h2>
      <p>
        Account details (name, email, phone), company and site information you enter, and usage
        data needed to operate the product (sessions, device type, and feature activity).
      </p>
      <h2>How we use it</h2>
      <p>
        We use this information to provide the service, authenticate users, support your team,
        improve reliability, and communicate product updates you opt into.
      </p>
      <h2>Who we share with</h2>
      <p>
        We do not sell personal data. We only share information with infrastructure providers
        required to run AmaniBuild (for example hosting and email delivery), under appropriate
        agreements.
      </p>
      <h2>Your choices</h2>
      <p>
        You can update profile details in-app, request account deletion, or ask questions about
        your data by emailing{" "}
        <a href="mailto:privacy@amanibuild.com">privacy@amanibuild.com</a>.
      </p>
      <p>Last updated: July 2026.</p>
    </MarketingPageShell>
  );
}
