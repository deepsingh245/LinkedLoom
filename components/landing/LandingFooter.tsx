import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#080808] pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2 lg:col-span-1">
            <div className="text-2xl font-black text-white mb-6">LinkedLoom<span className="text-figma-lime">.</span></div>
            <p className="text-sm text-on-surface-variant opacity-50 max-w-[200px] leading-relaxed">
              Automate your content, amplify your voice.
            </p>
          </div>
          <div>
            <h4 className="text-white text-xs font-black tracking-widest uppercase mb-6">Product</h4>
            <ul className="space-y-4">
              <li><Link href="#features" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Features</Link></li>
              <li><Link href="#pricing" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Pricing</Link></li>
              <li><Link href="#" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Changelog</Link></li>
              <li><Link href="#" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Support</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-xs font-black tracking-widest uppercase mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Creator's Blog</Link></li>
              <li><Link href="#" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Case Studies</Link></li>
              <li><Link href="#" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Community</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-xs font-black tracking-widest uppercase mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm text-on-surface-variant hover:text-figma-lime transition-colors opacity-60 hover:opacity-100">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-medium text-on-surface-variant opacity-40 uppercase tracking-widest">
            © 2026 LinkedLoom AI. Built for the modern creator.
          </div>
          <div className="flex items-center gap-6">
             <Link href="#" className="text-on-surface-variant hover:text-white transition-colors opacity-40 hover:opacity-100">X</Link>
             <Link href="#" className="text-on-surface-variant hover:text-white transition-colors opacity-40 hover:opacity-100">LinkedIn</Link>
             <Link href="#" className="text-on-surface-variant hover:text-white transition-colors opacity-40 hover:opacity-100">Discord</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
