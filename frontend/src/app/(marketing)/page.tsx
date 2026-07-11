import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { HeroSection } from "@/components/marketing/HeroSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { WavesSection } from "@/components/marketing/WavesSection";
import { fetchSubscriptionPlans } from "@/lib/api/plans";

export default async function HomePage() {
  const plans = await fetchSubscriptionPlans();

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection plans={plans} />
      <WavesSection />
    </>
  );
}
