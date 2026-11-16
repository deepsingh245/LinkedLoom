import { Clock, Link2, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import { MockFrame, StatusChip } from "./MockFrame";

/** A sourced draft waiting in the approval inbox. `compact` drops the run status and footer. */
export function ApprovalCardMock({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <MockFrame
      title="Approval inbox"
      label="Example: a LinkedIn draft written by Autopilot, waiting for approval, with its two sources listed underneath."
      className={className}
    >
      {!compact && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-background/60 px-4 py-2.5 text-[12px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-teal-ink">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-teal-ink opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-teal-ink" />
            </span>
            Autopilot on
          </span>
          <span className="font-mono text-muted-foreground">Research finished 09:40 · 4 drafts ready</span>
        </div>
      )}

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-wash text-[13px] font-semibold text-teal-ink">
              MR
            </span>
            <div className="leading-tight">
              <p className="text-[14px] font-semibold">Maya Reyes</p>
              <p className="text-[12px] text-muted-foreground">Persona: Founder voice · LinkedIn</p>
            </div>
          </div>
          <StatusChip>
            <Clock className="size-3.5" />
            Awaiting approval
          </StatusChip>
        </div>

        <div className="space-y-2.5 text-[14px] leading-relaxed">
          <p>Most teams don&apos;t have a content problem. They have a follow-through problem.</p>
          {!compact && (
            <p className="text-muted-foreground">
              Our product updates feed shipped 11 changes last month. We posted about two. Here&apos;s the
              simple routine we&apos;re using to close that gap…
            </p>
          )}
        </div>

        <div className="space-y-1.5 rounded-xl border border-border p-3">
          <p className="text-[12px] font-medium text-muted-foreground">Sources</p>
          <p className="flex items-center gap-2 text-[12.5px]">
            <Rss className="size-3.5 shrink-0 text-teal-ink" />
            <span className="truncate">Product updates feed</span>
            <span className="ml-auto shrink-0 font-mono text-[11.5px] text-muted-foreground">08:12</span>
          </p>
          <p className="flex items-center gap-2 text-[12.5px]">
            <Link2 className="size-3.5 shrink-0 text-teal-ink" />
            <span className="truncate">yourcompany.com/changelog</span>
            <span className="ml-auto shrink-0 font-mono text-[11.5px] text-muted-foreground">08:15</span>
          </p>
        </div>

        {!compact && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="font-mono text-[12px] text-muted-foreground">Next free slot · Thu 08:30 CET</span>
            <span className="flex gap-2">
              <FakeButton>Reject</FakeButton>
              <FakeButton primary>Approve &amp; schedule</FakeButton>
            </span>
          </div>
        )}
      </div>
    </MockFrame>
  );
}

export function FakeButton({ children, primary = false }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-[10px] px-3 text-[13px] font-medium",
        primary ? "bg-[#357d72] text-white" : "border border-border bg-card"
      )}
    >
      {children}
    </span>
  );
}
