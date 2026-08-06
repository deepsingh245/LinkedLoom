import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 py-24">
      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
            Stop wrestling with formats.<br />
            <span className="hero-gradient text-4xl md:text-5xl">Let AI do the heavy lifting.</span>
          </h2>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto font-medium opacity-70">
            You are a creator, not a copy-paster. Here is how LinkedLoom reclaims your time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {/* Old Way */}
          <GlassCard className="p-10 border-red-500/10 bg-red-500/[0.02]">
             <div className="flex items-center gap-3 mb-6 text-red-400 font-bold uppercase tracking-widest text-xs">
              <span className="material-symbols-outlined text-sm">history</span> The Old Way
            </div>
            <h3 className="text-3xl font-black text-white mb-6">15 Tabs & Context Switching</h3>
            <div className="aspect-video rounded-xl bg-[#121212] border border-white/5 overflow-hidden p-6 opacity-60">
               <div className="flex gap-2 mb-4">
                 {['ChatGPT', 'Notion', 'Google Docs', 'LinkedIn'].map(tab => (
                   <div key={tab} className="px-3 py-1 bg-white/5 rounded text-[10px] text-white/40">{tab}</div>
                 ))}
               </div>
               <div className="p-4 border border-red-500/20 rounded-lg bg-red-950/20 text-[10px] text-red-300">
                  <div className="font-bold mb-1 uppercase tracking-tighter">Format ERROR</div>
                  "This text is too long for X. Please shorten it while maintaining the tone..."
               </div>
            </div>
          </GlassCard>

          {/* New Way */}
          <GlassCard className="p-10 border-figma-lime/20 bg-figma-lime/[0.02]">
            <div className="flex items-center gap-3 mb-6 text-figma-lime font-bold uppercase tracking-widest text-xs">
              <span className="material-symbols-outlined text-sm">auto_awesome</span> The LinkedLoom Way
            </div>
            <h3 className="text-3xl font-black text-white mb-6">One Idea. Infinite Reach.</h3>
            <div className="aspect-video rounded-xl bg-[#121212] border border-figma-lime/10 overflow-hidden flex items-center justify-center p-8">
               <div className="w-full space-y-4">
                 <div className="h-2 w-1/3 bg-figma-lime/20 rounded-full"></div>
                 <div className="h-2 w-full bg-white/5 rounded-full"></div>
                 <div className="h-2 w-full bg-white/5 rounded-full"></div>
                 <Button className="w-full hero-button-gradient font-bold h-12">Generate Content</Button>
               </div>
            </div>
          </GlassCard>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { num: '01', title: 'Dump Your Thoughts.', desc: 'No editing required. Paste a transcript, a rough draft, or just a single sentence.' },
            { num: '02', title: 'The AI Context Engine.', desc: 'Our Weaver AI analyzes your core message, mapping it to the specific nuances and cultural DNA of every social platform.' },
            { num: '03', title: 'Platform Perfect.', desc: 'Instantly receive tailored versions for LinkedIn (professional), X (punchy), and Reddit (community-driven).' }
          ].map((item, i) => (
            <div key={i} className="relative group">
              <div className="text-8xl font-black text-white/[0.03] absolute -top-10 -left-4 select-none group-hover:text-figma-lime/[0.05] transition-colors">{item.num}</div>
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-figma-lime/10 border border-figma-lime/20 flex items-center justify-center mb-6 group-hover:bg-figma-lime group-hover:text-black transition-all">
                   <span className="text-sm font-black">{i + 1}</span>
                </div>
                <h4 className="text-2xl font-black text-white mb-4 group-hover:text-figma-lime transition-colors">{item.title}</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed opacity-60 font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}