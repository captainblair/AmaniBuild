import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import "@/styles/onboarding.css";

export const metadata = {
  title: "Onboarding",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
