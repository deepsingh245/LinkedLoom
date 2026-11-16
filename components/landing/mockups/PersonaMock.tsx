import { Globe, Rss } from "lucide-react";
import { MockFrame, StatusChip } from "./MockFrame";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[120px_1fr] sm:gap-4 sm:px-5">
      <span className="text-[12px] font-medium text-muted-foreground sm:pt-0.5">{label}</span>
      <div className="min-w-0 text-[13.5px]">{children}</div>
    </div>
  );
}

function Tag({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={
        active
          ? "rounded-lg border border-transparent bg-teal-wash px-2 py-0.5 text-[12.5px] font-medium text-teal-ink"
          : "rounded-lg border border-border px-2 py-0.5 text-[12.5px]"
      }
    >
      {children}
    </span>
  );
}

export function PersonaMock() {
  return (
    <MockFrame
      title="Persona settings"
      label="Example persona: role, audience, tone, topics, sources, research schedule and a monthly credit limit."
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
        <p className="text-[15px] font-semibold">Founder voice</p>
        <StatusChip tone="teal">Active</StatusChip>
      </div>
      <Field label="Role">Co-founder, B2B software</Field>
      <Field label="Audience">Operations leads at 50–500 person companies</Field>
      <Field label="Tone">
        <span className="flex flex-wrap gap-1.5">
          <Tag active>Professional</Tag>
          <Tag>Casual</Tag>
          <Tag>Technical</Tag>
        </span>
      </Field>
      <Field label="Topics">
        <span className="flex flex-wrap gap-1.5">
          <Tag>Async work</Tag>
          <Tag>Onboarding</Tag>
          <Tag>Product updates</Tag>
        </span>
      </Field>
      <Field label="Sources">
        <span className="grid gap-1.5">
          <span className="flex items-center gap-2"><Rss className="size-3.5 text-teal-ink" />Product updates feed</span>
          <span className="flex items-center gap-2"><Rss className="size-3.5 text-teal-ink" />Ops newsletter</span>
          <span className="flex items-center gap-2"><Globe className="size-3.5 text-teal-ink" />yourcompany.com/blog</span>
        </span>
      </Field>
      <Field label="Schedule">
        <span className="font-mono text-[12.5px]">Research daily 07:00 · up to 1 post a day</span>
      </Field>
      <Field label="Credit limit">
        <span className="flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-[38%] rounded-full bg-[#357d72]" />
          </span>
          <span className="font-mono text-[12.5px] text-muted-foreground">760 / 2,000</span>
        </span>
      </Field>
    </MockFrame>
  );
}
