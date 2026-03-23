"use client";

import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingSocialProof } from "@/components/landing/LandingSocialProof";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingSocialProof />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}
