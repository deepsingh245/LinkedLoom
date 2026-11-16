import { CalendarClock, Check, Clock, Pause } from "lucide-react";
import { MockFrame, StatusChip } from "./MockFrame";

const slots = [
  { day: "Mon", time: "08:30", title: "Why we moved standups to async", state: "published" },
  { day: "Wed", time: "08:30", title: "11 product changes, 2 posts", state: "scheduled" },
  { day: "Thu", time: "08:30", title: null, state: "open" },
  { day: "Fri", time: "12:00", title: "Hiring our first ops lead", state: "pending" },
] as const;

export function QueueMock() {
  return (
    <MockFrame
      title="Calendar & queue"
      label="Example week: one post published, one scheduled, one open slot and one draft awaiting approval, with a control to pause Autopilot."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <span className="font-mono text-[12px] text-muted-foreground">This week · Europe/Berlin</span>
        <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-2.5 py-1 text-[12.5px] font-medium">
          <Pause className="size-3.5" />
          Pause autopilot
        </span>
      </div>
      <ol className="border-t border-border">
        {slots.map((slot) => (
          <li
            key={slot.day}
            className="grid grid-cols-[56px_1fr] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[64px_1fr_auto] sm:px-5"
          >
            <span className="font-mono text-[12px] leading-tight text-muted-foreground">
              {slot.day}
              <br />
              {slot.time}
            </span>
            {slot.title ? (
              <span className="truncate text-[13.5px] font-medium">{slot.title}</span>
            ) : (
              <span className="rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[12.5px] text-muted-foreground">
                Open slot – the next approved draft goes here
              </span>
            )}
            <span className="col-start-2 sm:col-start-auto">
              {slot.state === "published" && (
                <StatusChip tone="done"><Check className="size-3.5" />Published</StatusChip>
              )}
              {slot.state === "scheduled" && (
                <StatusChip tone="teal"><CalendarClock className="size-3.5" />Scheduled</StatusChip>
              )}
              {slot.state === "pending" && (
                <StatusChip><Clock className="size-3.5" />Awaiting approval</StatusChip>
              )}
            </span>
          </li>
        ))}
      </ol>
    </MockFrame>
  );
}
