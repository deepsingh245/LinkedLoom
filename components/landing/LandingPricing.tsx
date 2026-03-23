import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function LandingPricing() {
  return (
    <section id="pricing" className="py-24 px-8 max-w-7xl mx-auto text-center">
      <div className="mb-20">
        <div className="text-figma-lime text-[10px] font-black tracking-[0.2em] mb-4 uppercase">PRICING</div>
        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
          Pricing built for creators.
        </h2>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto font-medium opacity-70">
          Simple pricing for infinite reach.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <GlassCard className="p-10 text-left border-white/5 flex flex-col bg-white/[0.01]">
          <h3 className="text-sm font-black tracking-[0.2em] mb-4 text-white/40 uppercase">FREE</h3>
          <div className="text-5xl font-black mb-8 text-white">$0<span className="text-lg text-on-surface-variant font-medium opacity-40">/mo</span></div>
          <ul className="space-y-4 mb-10 text-on-surface-variant text-sm font-medium opacity-70">
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> 10 AI Generations / mo</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Basic Style Matching</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Standard Support</li>
          </ul>
          <Button variant="outline" className="mt-auto w-full h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold">Get Started</Button>
        </GlassCard>
        
        <GlassCard className="p-10 text-left border-figma-lime/30 relative transform md:scale-105 shadow-[0_0_50px_rgba(184,255,82,0.05)] flex flex-col bg-figma-lime/[0.02]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-figma-lime text-black font-black px-4 py-1 rounded-full text-[10px] tracking-widest uppercase">MOST POPULAR</div>
          <h3 className="text-sm font-black tracking-[0.2em] mb-4 text-figma-lime uppercase">CREATOR</h3>
          <div className="text-5xl font-black mb-8 text-white">$29<span className="text-lg text-on-surface-variant font-medium opacity-40">/mo</span></div>
          <ul className="space-y-4 mb-10 text-white font-medium">
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Unlimited AI Generations</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Advanced Tone Mimicry</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Ghost Scheduling</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Priority Support</li>
          </ul>
          <Button variant="lime" className="mt-auto w-full h-12 rounded-xl text-md font-bold hero-button-glow">Start 30-Day Trial</Button>
        </GlassCard>

        <GlassCard className="p-10 text-left border-white/5 flex flex-col bg-white/[0.01]">
          <h3 className="text-sm font-black tracking-[0.2em] mb-4 text-white/40 uppercase">PRO</h3>
          <div className="text-5xl font-black mb-8 text-white">$99<span className="text-lg text-on-surface-variant font-medium opacity-40">/mo</span></div>
          <ul className="space-y-4 mb-10 text-on-surface-variant text-sm font-medium opacity-70">
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Everything in Creator</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Team Workspaces</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Custom API Access</li>
            <li className="flex items-center gap-3"><span className="text-figma-lime">✓</span> Dedicated Account Manager</li>
          </ul>
          <Button variant="outline" className="mt-auto w-full h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold">Contact Sales</Button>
        </GlassCard>
      </div>
    </section>
  );
}