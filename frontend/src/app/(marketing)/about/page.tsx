import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";

export const metadata: Metadata = {
  title: "About · AmaniBuild",
  description: "AmaniBuild is the operating system for Kenyan construction teams.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow="Company"
      title="Built for Kenyan construction"
      lede="AmaniBuild helps contractors run sites with clarity — from attendance and diaries to procurement and progress."
    >
      <p>
        We started AmaniBuild because site teams were juggling WhatsApp threads, spreadsheets, and
        paper logs just to know what happened yesterday. That chaos costs time, money, and trust.
      </p>
      <p>
        Our platform brings projects, people, materials, and progress into one workspace designed
        for how construction actually works in Kenya — multi-site, field-first, and role-aware.
      </p>
      <p>
        Whether you are a growing contractor or an established firm, AmaniBuild gives owners
        visibility, foremen a clear daily rhythm, and engineers the records they need.
      </p>
    </MarketingPageShell>
  );
}
