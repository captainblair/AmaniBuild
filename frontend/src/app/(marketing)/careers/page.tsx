import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";

export const metadata: Metadata = {
  title: "Careers · AmaniBuild",
  description: "Join the team building AmaniBuild for Kenyan construction.",
};

export default function CareersPage() {
  return (
    <MarketingPageShell
      eyebrow="Company"
      title="Build with us"
      lede="We are a small team shipping software for real construction sites across Kenya."
    >
      <p>
        Open roles will be listed here as we grow. Today we care most about people who understand
        field operations, product craft, and reliable engineering.
      </p>
      <p>
        If you want to help contractors run cleaner sites — product, design, engineering, or
        customer success — send a short note and your CV to{" "}
        <a href="mailto:careers@amanibuild.com">careers@amanibuild.com</a>.
      </p>
      <p>We read every message, even when we are not actively hiring for a specific seat.</p>
    </MarketingPageShell>
  );
}
