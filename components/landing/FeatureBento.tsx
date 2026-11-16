import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { Line } from "./mockups/MockFrame";

function Tile({
  title,
  text,
  className,
  children,
}: {
  title: string;
  text: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={cn("flex flex-col overflow-hidden rounded-[18px] border border-border bg-card", className)}>
      <div aria-hidden="true" className="flex-1 border-b border-border bg-background/60 p-5">
        {children}
      </div>
      <div className="p-5">
        <h3 className="text-[17px] font-semibold">{title}</h3>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

const CALENDAR_DOTS = new Set([1, 3, 8, 10, 12, 15, 17]);
const BARS = [34, 52, 41, 68, 46, 80, 58];

export function FeatureBento() {
  return (
    <section id="features" aria-labelledby="features-heading" className="scroll-mt-20 border-t border-border bg-card/40">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-medium text-teal-ink">Available today</p>
          <h2 id="features-heading" className="mt-2 text-[28px] font-semibold leading-tight sm:text-[34px]">
            Prefer to write it yourself? The studio is ready.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            Everything below works now, with or without Autopilot.
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <ul className="grid gap-4 md:grid-cols-6">
            <Tile
              className="md:col-span-4"
              title="Write with AI, in your tone"
              text="Start from an idea or rough notes, choose a tone, then edit the draft yourself before it goes anywhere."
            >
              <div className="max-w-md space-y-4">
                <div className="rounded-xl border border-border bg-card px-3.5 py-3 text-[13.5px]">
                  What we learned from 30 customer calls this quarter
                </div>
                <div className="flex flex-wrap gap-1.5 text-[12.5px]">
                  <span className="rounded-lg bg-teal-wash px-2 py-0.5 font-medium text-teal-ink">Professional</span>
                  <span className="rounded-lg border border-border px-2 py-0.5">Casual</span>
                  <span className="rounded-lg border border-border px-2 py-0.5">Storytelling</span>
                </div>
                <div className="space-y-2">
                  <Line className="w-full" />
                  <Line className="w-11/12" />
                  <Line className="w-3/5" />
                </div>
              </div>
            </Tile>

            <Tile
              className="md:col-span-2"
              title="See it as LinkedIn will"
              text="Check line breaks, the “see more” fold and the image before you schedule."
            >
              <div className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-center gap-2">
                  <span className="size-7 rounded-full bg-muted" />
                  <Line className="w-20" />
                </div>
                <div className="mt-3 space-y-2">
                  <Line className="w-full" />
                  <Line className="w-4/5" />
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">…see more</p>
              </div>
            </Tile>

            <Tile
              className="md:col-span-2"
              title="Schedule on a calendar"
              text="Plan the month. Due posts are published for you."
            >
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 21 }, (_, day) => (
                  <span key={day} className="flex aspect-square items-end justify-center rounded-md border border-border bg-card pb-1">
                    {CALENDAR_DOTS.has(day) && <span className="size-1.5 rounded-full bg-[#357d72]" />}
                  </span>
                ))}
              </div>
            </Tile>

            <Tile
              className="md:col-span-2"
              title="See what lands"
              text="Engagement for your published posts, so you know what to write more of."
            >
              <div className="flex h-[92px] items-end gap-2">
                {BARS.map((height, i) => (
                  <span
                    key={i}
                    style={{ height: `${height}%` }}
                    className={cn("flex-1 rounded-t-md", i === 5 ? "bg-[#357d72]" : "bg-muted")}
                  />
                ))}
              </div>
            </Tile>

            <Tile
              className="md:col-span-2"
              title="Add an image"
              text="Generate an image for a post with AI, or upload your own."
            >
              <div className="flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-border bg-card">
                <ImageIcon className="size-6 text-muted-foreground" />
              </div>
            </Tile>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
