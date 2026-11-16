import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { LifecycleStrip } from "@/components/landing/LifecycleStrip";
import { AutopilotSection } from "@/components/landing/AutopilotSection";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { ControlSection } from "@/components/landing/ControlSection";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { SiteFooter } from "@/components/landing/SiteFooter";

const description =
  "LinkedLoom researches the sources you choose, drafts sourced LinkedIn posts in your voice and schedules them – published only when you approve.";

export const metadata: Metadata = {
  title: "LinkedLoom – Researched LinkedIn posts, published when you approve",
  description,
  openGraph: {
    title: "LinkedLoom",
    description,
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="brand-surface flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <LifecycleStrip />
        <AutopilotSection />
        <FeatureBento />
        <ControlSection />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
