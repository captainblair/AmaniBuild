import type { ReactNode } from "react";
import { BackToTop } from "@/components/marketing/BackToTop";
import { PromoBanner } from "@/components/marketing/PromoBanner";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { PublicNav } from "@/components/marketing/PublicNav";
import "@/styles/homepage-hero.css";
import "@/styles/marketing-sections.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-light)]">
      <PromoBanner />
      <PublicNav />
      <main>{children}</main>
      <PublicFooter />
      <BackToTop />
    </div>
  );
}
