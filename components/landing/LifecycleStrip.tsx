import { Reveal } from "./Reveal";

const STAGES = [
  { name: "Discover", text: "Checks the feeds and sites you picked, on your research schedule." },
  { name: "Verify", text: "Keeps fresh, relevant sources and drops ideas you've already covered." },
  { name: "Draft", text: "Writes in the persona's voice, with its sources attached." },
  { name: "Review", text: "Drafts wait in your approval inbox. Edit, approve or reject." },
  { name: "Queue", text: "Approved posts take the next free slot on your calendar." },
  { name: "Publish", text: "Goes to LinkedIn exactly once, and the run is logged." },
] as const;

export function LifecycleStrip() {
  return (
    <section id="autopilot" aria-labelledby="autopilot-heading" className="scroll-mt-20 border-y border-border bg-card">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-medium text-teal-ink">AI Autopilot</p>
          <h2 id="autopilot-heading" className="mt-2 text-[28px] font-semibold leading-tight sm:text-[34px]">
            Six steps from source to post. You decide at step four.
          </h2>
        </Reveal>

        <ol className="isolate mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {STAGES.map((stage, i) => (
            <li
              key={stage.name}
              style={{ "--stage": i } as React.CSSProperties}
              className="lifecycle-stage relative rounded-2xl border border-border p-4"
            >
              <span className="font-mono text-[12px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-2 text-[15px] font-semibold">
                {stage.name}
                {stage.name === "Review" && (
                  <span className="ml-2 rounded-md bg-teal-wash px-1.5 py-0.5 align-middle text-[11px] font-medium text-teal-ink">
                    You
                  </span>
                )}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{stage.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
