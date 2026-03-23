import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LandingNavbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex justify-between items-center px-8 py-5 max-w-7xl mx-auto">
        <Link href="/" className="text-xl font-black text-white tracking-widest uppercase flex items-center">
          LinkedLoom<span className="text-figma-lime ml-0.5">.</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-10 font-medium text-xs tracking-widest uppercase text-on-surface-variant">
          <Link className="hover:text-white transition-colors" href="#features">Solutions</Link>
          <Link className="hover:text-white transition-colors" href="#features">Intelligence</Link>
          <Link className="hover:text-white transition-colors" href="#how-it-works">Network</Link>
          <Link className="hover:text-white transition-colors" href="#pricing">Pricing</Link>
        </nav>
        <div className="flex items-center space-x-4 md:space-x-8 font-bold text-xs">
          <Link href="/login" className="hidden md:block text-on-surface-variant hover:text-white transition-colors tracking-widest uppercase">Log In</Link>
          <Link href="/register">
            <Button variant="lime" size="sm" className="px-6 rounded-lg uppercase tracking-widest text-[10px]">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}