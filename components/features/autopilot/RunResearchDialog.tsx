"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, FileText, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RunSteps, statsSummary } from "./RunSteps"
import { useRunResearch } from "@/lib/query/hooks/use-research"
import { subscribeToLatestRun } from "@/lib/firebase/research"
import { Routes } from "@/lib/routes"
import type { Persona } from "@/types/autopilot"
import type { WorkflowRun } from "@/types/research"

interface RunResearchDialogProps {
    persona: Persona
    userId?: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Starts a research run and shows its steps live. The call itself returns only when the run
 * finishes (can take minutes), so progress comes from the run document, not the call.
 */
export function RunResearchDialog({ persona, userId, open, onOpenChange }: RunResearchDialogProps) {
    const run = useRunResearch(userId)
    const [live, setLive] = useState<WorkflowRun | null>(null)
    const startedAfter = useRef(0)

    // Follow the newest run while ours is in flight; ignore older runs left over from before the click.
    useEffect(() => {
        // Stay subscribed after the call returns so the final step states arrive; reset() ends it.
        if (!userId || run.isIdle) return
        return subscribeToLatestRun(userId, (latest) => {
            if (latest && latest.personaId === persona.id && (latest.startedAt?.getTime() ?? Date.now()) >= startedAfter.current) setLive(latest)
        })
    }, [userId, run.isIdle, persona.id])

    const result = run.data
    const finished = result ? live : null
    const shown = live
    const usesSearch = persona.research.webSearch
    const hasSources = persona.research.feedUrls.length > 0 || usesSearch

    const close = (v: boolean) => {
        if (run.isPending) return // keep the dialog while a run is in progress
        if (!v) {
            run.reset()
            setLive(null)
        }
        onOpenChange(v)
    }

    const start = () => {
        startedAfter.current = Date.now() - 15_000
        setLive(null)
        run.mutate(persona.id)
    }

    const statusMessage = result
        ? result.status === "completed"
            ? result.drafts > 0 ? `${result.drafts} draft${result.drafts === 1 ? "" : "s"} ready for review.` : "Finished, but nothing new was worth writing about."
            : result.status === "partial" ? "Stopped early." : "The run failed."
        : null

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Run research for “{persona.name}”</DialogTitle>
                    <DialogDescription>
                        Reads your feeds{usesSearch ? " and searches the web (Gemini)" : ""}, writes up to 3 sourced drafts and fact-checks them.
                        This uses AI ({persona.ai.connectionId ? "your key" : "LinkedLoom credits"}) and can take a few minutes. Nothing is published.
                    </DialogDescription>
                </DialogHeader>

                {!hasSources && (
                    <p className="flex items-start gap-2 rounded-xl border border-border bg-accent/40 p-3 text-sm text-muted-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Add at least one RSS feed (or turn on web search) in this persona first.
                    </p>
                )}

                {(run.isPending || result || shown) && <RunSteps steps={shown?.steps ?? []} />}

                {result && (
                    <div className="space-y-2 rounded-xl border border-border bg-accent/30 p-4 text-sm">
                        <p className="font-medium text-foreground">{statusMessage}</p>
                        {statsSummary(result.stats) && <p className="text-xs text-muted-foreground">{statsSummary(result.stats)}</p>}
                        {result.notes.map((n, i) => <p key={i} className="text-xs text-muted-foreground">• {n}</p>)}
                        {finished?.rejections?.length ? (
                            <p className="text-xs text-muted-foreground">Rejected: {finished.rejections.map((r) => r.reasons[0]).join(" ")}</p>
                        ) : null}
                    </div>
                )}

                <DialogFooter>
                    {result && result.drafts > 0 && (
                        <Button asChild>
                            <Link href={Routes.AUTOPILOT_DRAFTS}><FileText className="mr-2 h-4 w-4" /> Review drafts</Link>
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => close(false)} disabled={run.isPending}>Close</Button>
                    {!result && (
                        <Button onClick={start} disabled={run.isPending || !hasSources}>
                            <Play className="mr-2 h-4 w-4" /> {run.isPending ? "Running..." : "Start"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
