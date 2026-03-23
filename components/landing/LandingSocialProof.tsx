import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";

export function LandingSocialProof() {
  return (
    <section id="social-proof" className="py-24 px-8 max-w-7xl mx-auto text-center">

      <div className="text-center md:text-left mb-20 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="max-w-xl">
            <div className="text-figma-lime text-[10px] font-black tracking-[0.2em] mb-4 uppercase">Social Proof</div>
            <h2 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-4">
            Loved by creators who <span className="hero-gradient">value their time.</span>
            </h2>
        </div>
        <p className="text-on-surface-variant text-lg max-w-[280px] font-medium opacity-60 md:text-right leading-relaxed">
           Join 15,000+ power users weaving their digital influence daily.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {[
          { name: 'Sarah Chen', role: 'Founder @ GrowthScale', text: 'LinkedLoom saved me 10+ hours a week on LinkedIn and X formatting. It\'s like having a ghostwriter who knows exactly how I think.' },
          { name: 'Marcus Thorne', role: 'Content Strategist', text: 'The AI suggestions for X threading are unmatched. LinkedLoom saved me 12 hours last week alone. Total game changer for my workflow.' },
          { name: 'Elena Rodriguez', role: 'Director @ Nexus Media', text: 'I used to dread formatting long-form posts. LinkedLoom saved me 10+ hours a week and my engagement has never been higher.' },
          { name: 'David Park', role: 'SaaS Consultant', text: 'The automation doesn\'t feel automated. LinkedLoom saved me 15 hours a week while keeping my authentic voice intact.' },
          { name: 'Jordan Smith', role: 'Agency Owner', text: 'If you are serious about building a brand on X, you need this. LinkedLoom saved me 10+ hours a week from day one.' },
          { name: 'Chloe Vanes', role: 'Entrepreneur', text: 'The interface is so clean, but the power under the hood is insane. LinkedLoom saved me 8 hours a week effortlessly.' }
        ].map((item, i) => (
          <GlassCard key={i} className="p-8 flex flex-col justify-between hover:bg-white/[0.03] transition-colors border-white/5 opacity-80 hover:opacity-100 h-full">
            <div>
                <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-figma-lime text-xs">star</span>
                ))}
                </div>
                <p className="text-on-surface-variant leading-relaxed mb-8 italic opacity-90">"{item.text}"</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center overflow-hidden">
                 <span className="material-symbols-outlined text-orange-400">person</span>
              </div>
              <div>
                <div className="font-bold text-white text-sm">{item.name}</div>
                <div className="text-xs text-on-surface-variant opacity-60">{item.role}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}