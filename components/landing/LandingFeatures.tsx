import { GlassCard } from "@/components/ui/glass-card";
import Link from 'next/link';

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 px-8 max-w-7xl mx-auto">
      <div className="text-center mb-24">
        <div className="text-figma-lime text-[10px] font-black tracking-[0.2em] mb-4 uppercase">Intelligent Generation</div>
        <h2 className="text-4xl md:text-7xl font-black text-white leading-[0.9] tracking-tight mb-8">
          Write with the internet's<br />smartest co-pilot.
        </h2>
        <p className="max-w-2xl mx-auto text-on-surface-variant text-lg md:text-xl opacity-70 mb-12">
          Dial in your tone—from professional thought-leader to casual creator. LinkedLoom's AI doesn't just write; it understands the specific psychology of LinkedIn, X, and Reddit audiences.
        </p>
        <div className="flex justify-center">
            <Link href="#" className="text-figma-lime font-bold flex items-center gap-2 hover:gap-4 transition-all">
                Explore the Studio <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 mb-40 items-center">
         <div className="order-2 md:order-1">
            <div className="text-blue-400 text-[10px] font-black tracking-[0.2em] mb-4 uppercase">Perfect Execution</div>
            <h3 className="text-3xl md:text-5xl font-black text-white leading-[1.1] tracking-tight mb-8">
                Know exactly how it looks before you hit send.
            </h3>
            <p className="text-on-surface-variant text-lg opacity-70 leading-relaxed mb-10">
                Never guess if your image gets cropped or your thread breaks. Get real-time, pixel-perfect previews for every platform simultaneously.
            </p>
         </div>
         <div className="order-1 md:order-2 glass-card p-4 rounded-3xl border-white/5 shadow-2xl overflow-hidden aspect-video flex items-center justify-center bg-[#0d0d0d] tilted-mockup">
             <div className="w-full h-full relative p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-figma-lime/20 border border-figma-lime/30"></div>
                    <div className="space-y-1">
                        <div className="h-2 w-20 bg-white/20 rounded-full"></div>
                        <div className="h-2 w-12 bg-white/10 rounded-full"></div>
                    </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full"></div>
                <div className="h-2 w-2/3 bg-white/5 rounded-full"></div>
                <div className="w-full aspect-video bg-white/2 rounded-xl border border-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/10 text-4xl">image</span>
                </div>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
         <div className="glass-card p-4 rounded-3xl border-white/5 shadow-2xl overflow-hidden aspect-video flex items-center justify-center bg-[#0d0d0d] tilted-mockup-reverse">
             <div className="w-full h-full p-8 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                    <div className="text-xs font-bold text-white/40">November 2024</div>
                    <div className="flex gap-2 text-white/40"><span className="material-symbols-outlined text-sm">chevron_left</span><span className="material-symbols-outlined text-sm">chevron_right</span></div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="aspect-square bg-white/2 border border-white/5 rounded-lg relative overflow-hidden">
                            {i === 7 && <div className="absolute inset-x-1 top-2 h-1 bg-figma-lime/40 rounded-full"></div>}
                            {i === 9 && <div className="absolute inset-x-1 top-2 h-1 bg-purple-500/40 rounded-full"></div>}
                        </div>
                    ))}
                </div>
             </div>
         </div>
         <div>
            <div className="text-figma-lime text-[10px] font-black tracking-[0.2em] mb-4 uppercase">Automated Growth</div>
            <h3 className="text-3xl md:text-5xl font-black text-white leading-[1.1] tracking-tight mb-8">
                Build your presence while you sleep.
            </h3>
            <p className="text-on-surface-variant text-lg opacity-70 leading-relaxed mb-10">
                Map out your entire month in minutes. Our visual content library and smart calendar ensure you hit your audience when they are most active.
            </p>
         </div>
      </div>
    </section>
  );
}
