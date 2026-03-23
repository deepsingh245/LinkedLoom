import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeshGlow } from "@/components/ui/mesh-glow";

export function LandingHero() {
  return (
    <section className="relative pt-40 pb-20 max-w-7xl mx-auto px-6 text-center">
      <MeshGlow />
        <div className="flex justify-center mb-10">
          <Badge className="badge-glow bg-[#0a0a0a]/50 text-figma-lime border-figma-lime/30 px-4 py-1.5 rounded-full text-[10px] tracking-[0.2em] font-bold flex items-center gap-2">
            <span className="text-xs">✨</span> LINKEDLOOM AI ENGINE IS LIVE
          </Badge>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-[0.9] mb-8">
          Write Once.<br />
          <span className="hero-gradient">Dominate Everywhere.</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-on-surface-variant text-lg md:text-xl font-medium leading-relaxed mb-12 px-4 opacity-80">
          Stop context switching. LinkedLoom's AI automatically adapts, styles, and schedules your single idea perfectly for LinkedIn, X, and Reddit. Focus on the content, we handle the format.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
          <Button size="lg" className="hero-button-gradient hero-button-glow font-bold px-10 h-14 rounded-xl text-md transition-all hover:scale-105 active:scale-95">
            Start for free
          </Button>
          <Button size="lg" variant="outline" className="border-white/10 bg-white/5 font-bold px-10 h-14 rounded-xl text-md hover:bg-white/10 transition-all active:scale-95">
            View Memo
          </Button>
        </div>
      <div className="relative max-w-5xl mx-auto">
        <div className="absolute -top-20 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-20 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]"></div>
        <div className="relative z-10 p-8 rounded-3xl bg-surface-container-low border border-outline-variant/10 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 flex flex-col items-center">
              <GlassCard className="w-full aspect-square p-6 flex flex-col justify-between items-start text-left relative overflow-hidden group bg-[#0d0d0d] border-white/5">
                <div className="relative z-10 w-full">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-2 h-2 rounded-full bg-figma-lime shadow-[0_0_8px_rgba(184,255,82,0.5)]"></div>
                    <span className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Input Seed</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-4 leading-tight">The future of AI in B2B.</h3>
                  <p className="text-xs text-on-surface-variant opacity-50 leading-relaxed max-w-[180px]">
                    Analyze market trends to predict the next wave of automation in the enterprise sector...
                  </p>
                </div>
                <div className="relative z-10 w-full flex justify-between items-center mt-8">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                         <span className="material-symbols-outlined text-white/20 text-xs">person</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                         <span className="material-symbols-outlined text-white/20 text-xs">person</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-figma-lime/10 border border-figma-lime/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-figma-lime text-lg">auto_fix_high</span>
                  </div>
                </div>
              </GlassCard>
            </div>
            <div className="hidden md:flex md:col-span-1 justify-center items-center">
              <div className="h-px w-full bg-figma-lime/20"></div>
            </div>
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard className="p-5 flex flex-col h-56 bg-[#0d0d0d] border-white/5">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="material-symbols-outlined text-blue-500 text-sm">work</span>
                  <span className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">LinkedIn</span>
                </div>
                <div className="space-y-3">
                  <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
                  <div className="h-1.5 w-3/4 bg-white/5 rounded-full"></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
                </div>
                <div className="mt-auto pt-4 flex justify-between items-center">
                  <div className="h-4 w-12 bg-figma-lime/20 rounded"></div>
                  <span className="material-symbols-outlined text-xs text-white/20">trending_up</span>
                </div>
              </GlassCard>
              <GlassCard className="p-5 flex flex-col h-56 bg-[#0d0d0d] border-white/5">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="material-symbols-outlined text-white text-sm">close</span>
                  <span className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">X</span>
                </div>
                <div className="space-y-3">
                  <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
                  <div className="h-1.5 w-5/6 bg-white/5 rounded-full"></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-3 w-10 bg-blue-500/20 rounded-full"></div>
                  <div className="h-3 w-10 bg-blue-500/20 rounded-full"></div>
                </div>
                <div className="mt-auto pt-4 flex justify-between items-center">
                   <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-white/5"></div>
                    <div className="w-3 h-3 rounded-full bg-white/5"></div>
                   </div>
                  <span className="material-symbols-outlined text-xs text-white/20">favorite</span>
                </div>
              </GlassCard>
              <GlassCard className="p-5 flex flex-col h-56 bg-[#0d0d0d] border-white/5">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="material-symbols-outlined text-orange-600 text-sm">forum</span>
                  <span className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">Reddit</span>
                </div>
                <div className="space-y-3">
                  <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[10px] text-purple-500">arrow_upward</span>
                    <span className="text-[10px] text-purple-500 font-bold">4.2k</span>
                  </div>
                  <div className="h-4 w-4 bg-purple-500/20 rounded-full"></div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 hidden lg:block space-y-4">
          <GlassCard className="px-4 py-2 flex items-center space-x-3 -rotate-3 hover:rotate-0 transition-transform">
            <span className="material-symbols-outlined text-primary">psychology</span>
            <span className="text-xs font-semibold">Style Mimicry</span>
          </GlassCard>
          <GlassCard className="px-4 py-2 flex items-center space-x-3 rotate-2 hover:rotate-0 transition-transform">
            <span className="material-symbols-outlined text-secondary">schedule</span>
            <span className="text-xs font-semibold">Ghost Scheduling</span>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
