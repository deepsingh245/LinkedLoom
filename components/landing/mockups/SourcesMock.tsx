import { Copy, Globe, Link2, Rss } from "lucide-react";
import { MockFrame, StatusChip } from "./MockFrame";

const sources = [
  { icon: Rss, name: "Product updates feed", time: "08:12", status: "Used" },
  { icon: Link2, name: "yourcompany.com/changelog", time: "08:15", status: "Used" },
  { icon: Globe, name: "Ops newsletter, issue 42", time: "07:58", status: "Not relevant" },
  { icon: Copy, name: "Too close to your post from 12 Oct", time: "08:16", status: "Skipped" },
] as const;

export function SourcesMock() {
  return (
    <MockFrame
      title="Draft evidence"
      label="Example: the sources behind a draft, with fetch times. Two were used, one was not relevant and a near-duplicate idea was skipped."
    >
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <p className="text-[12px] font-medium text-muted-foreground">Draft</p>
        <p className="mt-1 text-[14px] font-medium">Most teams don&apos;t have a content problem…</p>
      </div>
      <ul className="px-2 pb-2 sm:px-3">
        {sources.map(({ icon: Icon, name, time, status }) => (
          <li key={name} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-[13px] sm:px-3">
            <Icon className="size-4 shrink-0 text-teal-ink" />
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <span className="hidden font-mono text-[11.5px] text-muted-foreground sm:inline">{time}</span>
            <StatusChip tone={status === "Used" ? "teal" : "done"} className="w-[92px] justify-center">
              {status}
            </StatusChip>
          </li>
        ))}
      </ul>
      <p className="border-t border-border px-4 py-3 font-mono text-[12px] text-muted-foreground sm:px-5">
        Sources from the last 48 h · at least 2 per draft
      </p>
    </MockFrame>
  );
}
