import { cn } from "@/lib/utils";

/**
 * App-window frame for product illustrations. The contents are sample data, so the frame is
 * labelled "Example" and exposed to assistive tech as a single described image.
 */
export function MockFrame({
  title,
  label,
  children,
  className,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn(
        "overflow-hidden rounded-[18px] border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(32,36,43,0.04),0_12px_32px_-12px_rgba(32,36,43,0.14)] dark:shadow-none",
        className
      )}
    >
      <div aria-hidden="true" className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-medium">{title}</span>
        <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          Example
        </span>
      </div>
      <div aria-hidden="true">{children}</div>
    </figure>
  );
}

export function StatusChip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "done";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-0.5 text-[12px] font-medium",
        tone === "neutral" && "bg-muted text-foreground",
        tone === "teal" && "bg-teal-wash text-teal-ink",
        tone === "done" && "border border-border text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Placeholder text line for illustration bodies. */
export function Line({ className }: { className?: string }) {
  return <span className={cn("block h-2 rounded-full bg-muted", className)} />;
}
