import { CircleStop, Linkedin, ListChecks, ShieldCheck, ToggleLeft, Wallet } from "lucide-react";
import { Reveal } from "./Reveal";

const CONTROLS = [
  { icon: ShieldCheck, title: "Approval is the default", text: "Nothing Autopilot writes is published until you approve it." },
  { icon: ToggleLeft, title: "Auto-publish is opt-in", text: "Set per persona, off by default, and it asks you to confirm before it's switched on." },
  { icon: CircleStop, title: "One switch stops everything", text: "Pause a single persona, or stop all research and publishing at once." },
  { icon: ListChecks, title: "Every run is logged", text: "See what was researched, drafted, skipped and published, and when." },
  { icon: Wallet, title: "Limits you set", text: "Each persona has a monthly credit limit, so research can't run past your budget." },
  { icon: Linkedin, title: "LinkedIn only, for now", text: "Posts go only to the LinkedIn account you've connected and authorised." },
] as const;

export function ControlSection() {
  return (
    <section id="control" aria-labelledby="control-heading" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-28">
        <Reveal className="lg:col-span-4">
          <p className="text-[13px] font-medium text-teal-ink">Control</p>
          <h2 id="control-heading" className="mt-2 text-[28px] font-semibold leading-tight sm:text-[34px]">
            Automation that waits for you.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            Autopilot does the reading and the first draft. What gets posted, and when, stays your decision.
          </p>
        </Reveal>

        <Reveal className="lg:col-span-8">
          <ul className="divide-y divide-border rounded-[18px] border border-border bg-card">
            {CONTROLS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 p-5 sm:items-center sm:px-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-wash text-teal-ink">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <div className="grid gap-0.5 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-6">
                  <h3 className="text-[15px] font-semibold">{title}</h3>
                  <p className="text-[14.5px] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
