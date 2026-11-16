"use client"

import { CheckCircle2, CircleDashed, Loader2, MinusCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RunStats, RunStep, StepName, StepStatus } from "@/types/research"

const STEP_LABELS: Record<StepName, string> = {
    discover: "Find articles",
    filter: "Pick the relevant, new ones",
    fetch: "Read the articles",
    extract: "Extract verifiable facts",
    generate: "Write drafts",
    verify: "Fact-check drafts",
    store: "Save results",
}

const ORDER: StepName[] = ["discover", "filter", "fetch", "extract", "generate", "verify", "store"]

function StepIcon({ status }: { status: StepStatus | "pending" }) {
    switch (status) {
    case "running": return <Loader2 className="h-4 w-4 animate-spin text-primary" />
    case "done": return <CheckCircle2 className="h-4 w-4 text-primary" />
    case "failed": return <XCircle className="h-4 w-4 text-destructive" />
    case "skipped": return <MinusCircle className="h-4 w-4 text-muted-foreground" />
    default: return <CircleDashed className="h-4 w-4 text-muted-foreground/50" />
    }
}

/** Timeline of the pipeline steps; steps that haven't started yet show as pending. */
export function RunSteps({ steps, compact }: { steps: RunStep[]; compact?: boolean }) {
    const byName = new Map(steps.map((s) => [s.name, s]))
    return (
        <ol className={cn("space-y-2", compact && "space-y-1")}>
            {ORDER.map((name) => {
                const step = byName.get(name)
                const seconds = step?.finishedAt ? Math.max(0, Math.round((step.finishedAt - step.startedAt) / 1000)) : undefined
                return (
                    <li key={name} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5"><StepIcon status={step?.status ?? "pending"} /></div>
                        <div className="min-w-0">
                            <p className={cn(step ? "text-foreground" : "text-muted-foreground/60")}>
                                {STEP_LABELS[name]}
                                {seconds !== undefined && <span className="ml-2 text-xs text-muted-foreground">{seconds}s</span>}
                            </p>
                            {step?.note && <p className="text-xs text-muted-foreground">{step.note}</p>}
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}

const STAT_LABELS: Array<[keyof RunStats, string]> = [
    ["candidates", "found"],
    ["afterFilter", "relevant"],
    ["duplicates", "already seen"],
    ["fetched", "read"],
    ["claims", "facts"],
    ["draftsAccepted", "drafts kept"],
    ["draftsRejected", "drafts rejected"],
    ["credits", "credits"],
]

/** Compact "12 found · 4 relevant · …" summary of a run, skipping zeros. */
export function statsSummary(stats: Partial<RunStats>): string {
    return STAT_LABELS
        .filter(([key]) => (stats[key] ?? 0) > 0)
        .map(([key, label]) => `${stats[key]} ${label}`)
        .join(" · ")
}
