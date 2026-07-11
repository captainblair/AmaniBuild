import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";

export const metadata: Metadata = {
  title: "Contact · AmaniBuild",
  description: "Get in touch with the AmaniBuild team.",
};

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Company"
      title="Talk to us"
      lede="Questions about plans, demos, or onboarding? We are based in Nairobi and happy to help."
    >
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:hello@amanibuild.com">hello@amanibuild.com</a>
      </p>
      <p>
        <strong>Sales:</strong>{" "}
        <a href="mailto:sales@amanibuild.com">sales@amanibuild.com</a>
      </p>
      <p>
        <strong>Support:</strong>{" "}
        <a href="mailto:support@amanibuild.com">support@amanibuild.com</a>
      </p>
      <p>
        <strong>Location:</strong> Nairobi, Kenya
      </p>
      <p>
        Prefer a walkthrough? Email sales and we will schedule a short demo tailored to your sites
        and team size.
      </p>
    </MarketingPageShell>
  );
}
