import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { PersonaMock } from "./mockups/PersonaMock";
import { QueueMock } from "./mockups/QueueMock";
import { SourcesMock } from "./mockups/SourcesMock";

const BLOCKS = [
  {
    eyebrow: "Set up once",
    title: "Give each persona a brief, a reading list and a budget.",
    text: "Describe who the persona is, who it writes for and the tone to use. Add the RSS feeds and sites it should follow, topics to avoid, and how often it researches.",
    points: ["Role, audience, tone and topics", "RSS feeds and websites to follow", "Research schedule and a monthly credit limit"],
    mock: <PersonaMock />,
  },
  {
    eyebrow: "Sourced, not invented",
    title: "Every draft shows where its facts came from.",
    text: "Drafts arrive with their sources and the time each one was fetched. Stale links are left out, and ideas too close to something you've already posted are skipped.",
    points: ["Links and fetch times on every draft", "Minimum number of sources per draft", "Near-duplicates filtered out"],
    mock: <SourcesMock />,
  },
  {
    eyebrow: "Approve and it's scheduled",
    title: "One click puts a post in the next free slot.",
    text: "Approved drafts land in your posting windows on the calendar and go to LinkedIn exactly once. Pause a persona, or stop all Autopilot activity, whenever you need to.",
    points: ["Your posting windows and time zone", "Published once, with a run log", "Pause one persona or stop everything"],
    mock: <QueueMock />,
  },
] as const;

export function AutopilotSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-medium text-teal-ink">How it works</p>
          <h2 id="how-heading" className="mt-2 text-[28px] font-semibold leading-tight sm:text-[34px]">
            A research desk for your LinkedIn, with you as the editor.
          </h2>
        </Reveal>

        <div className="mt-14 space-y-20 lg:mt-20 lg:space-y-28">
          {BLOCKS.map((block, i) => (
            <Reveal key={block.title}>
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
                <div className={cn("lg:col-span-5", i % 2 === 1 && "lg:order-2")}>
                  <p className="font-mono text-[12px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} · {block.eyebrow}
                  </p>
                  <h3 className="mt-3 text-[22px] font-semibold leading-snug sm:text-[26px]">{block.title}</h3>
                  <p className="mt-4 max-w-[65ch] text-[16px] leading-relaxed text-muted-foreground">{block.text}</p>
                  <ul className="mt-6 space-y-2.5">
                    {block.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-[15px]">
                        <Check className="mt-0.5 size-4 shrink-0 text-teal-ink" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn("lg:col-span-7", i % 2 === 1 && "lg:order-1")}>{block.mock}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
