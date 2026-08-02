import { DashboardShell } from "@/components/layout/DashboardShell";
import { ComparisonSection } from "@/components/marketing/ComparisonSection";
import { CtaSection } from "@/components/marketing/CtaSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { LandingHero } from "@/components/marketing/LandingHero";
import { WhoIsThisFor } from "@/components/marketing/WhoIsThisFor";
import { WhyFeatures } from "@/components/marketing/WhyFeatures";

export default function Home() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-2">
        <LandingHero />
        <div className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
          <HowItWorks />
          <WhyFeatures />
          <WhoIsThisFor />
          <ComparisonSection />
          <CtaSection />
        </div>
      </div>
    </DashboardShell>
  );
}
