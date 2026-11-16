import { cn } from "@/lib/utils";

/** LinkedLoom mark (an "L" whose foot is woven over a second thread) and name. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground", className)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 shrink-0">
        <rect width="24" height="24" rx="7" className="fill-[#357d72]" />
        <path d="M15 5.5v8.6" stroke="#fff" strokeOpacity=".6" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M8.5 5.5v12h9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[17px]">LinkedLoom</span>
    </span>
  );
}
