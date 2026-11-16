"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, FileText, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RunSteps, statsSummary } from "./RunSteps"
import { useCancelRun, useRunResearch } from "@/lib/query/hooks/use-research"
import { subscribeToRun } from "@/lib/firebase/research"
import { queryKeys } from "@/lib/query/query-keys"
import { Routes } from "@/lib/routes"
import type { Persona } from "@/types/autopilot"
import type { WorkflowRun } from "@/types/research"

interface RunResearchDialogProps {
    persona: Persona
    userId?: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

const terminal = new Set(["completed", "partial", "failed", "cancelled", "skipped"])

/** A queued run continues on the server even if this dialog is closed. */
export function RunResearchDialog({ persona, userId, open, onOpenChange }: RunResearchDialogProps) {
    const queryClient = useQueryClient()
    const startRun = useRunResearch(userId)
    const cancelRun = useCancelRun(userId)
    const [runId, setRunId] = useState<string | null>(null)
    const [live, setLive] = useState<WorkflowRun | null>(null)
    const [followError, setFollowError] = useState(false)
    const requestVersion = useRef(0)

    useEffect(() => {
        if (!userId || !runId) return
        return subscribeToRun(userId, runId, (next) => {
            setLive(next)
            if (terminal.has(next.status)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.all(userId) })
            }
        }, () => setFollowError(true))
    }, [userId, runId, queryClient])

    const hasSources = persona.research.feedUrls.length > 0 || persona.research.webSearch
    const finished = live && terminal.has(live.status)
    const active = !!runId && !finished
    const drafts = live?.draftIds?.length ?? live?.stats.draftsAccepted ?? 0

    const close = (nextOpen: boolean) => {
        if (!nextOpen) {
            requestVersion.current++
            startRun.reset()
            cancelRun.reset()
            setRunId(null)
            setLive(null)
            setFollowError(false)
        }
        onOpenChange(nextOpen)
    }

    const start = async () => {
        const version = ++requestVersion.current
        setLive(null)
        setFollowError(false)
        try {
            const queued = await startRun.mutateAsync(persona.id)
            if (version === requestVersion.current) setRunId(queued.runId)
        } catch {
            // The mutation hook shows the callable error.
        }
    }

    const statusMessage = live?.status === "completed"
        ? drafts > 0 ? `${drafts} draft${drafts === 1 ? "" : "s"} ready for review.` : "Finished, but nothing new was worth writing about."
        : live?.status === "partial" ? "Stopped early; review any drafts that were saved."
        : live?.status === "failed" ? "The run failed."
        : live?.status === "cancelled" ? "The run was cancelled."
        : live?.status === "skipped" ? "The run was skipped."
        : live?.status === "running" ? "Research is running. You can close this window and check Runs later."
        : runId ? "Research is queued. You can close this window and check Runs later." : null

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Run research for “{persona.name}”</DialogTitle>
                    <DialogDescription>
                        Reads your feeds{persona.research.webSearch ? " and searches the web (Gemini)" : ""}, writes up to 3 sourced drafts and fact-checks them.
                        This uses AI ({persona.ai.connectionId ? "your key" : "LinkedLoom credits"}) and can take a few minutes. Nothing is published.
                    </DialogDescription>
                </DialogHeader>

                {!hasSources && (
                    <p className="flex items-start gap-2 rounded-xl border border-border bg-accent/40 p-3 text-sm text-muted-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Add at least one RSS feed (or turn on web search) in this persona first.
                    </p>
                )}

                {runId && <RunSteps steps={live?.steps ?? []} />}

                {statusMessage && (
                    <div className="space-y-2 rounded-xl border border-border bg-accent/30 p-4 text-sm" role="status" aria-live="polite">
                        <p className="font-medium text-foreground">{statusMessage}</p>
                        {live?.reason && <p className="text-xs text-muted-foreground">{live.reason}</p>}
                        {live && statsSummary(live.stats) && <p className="text-xs text-muted-foreground">{statsSummary(live.stats)}</p>}
                        {live?.notes.map((note, i) => <p key={i} className="text-xs text-muted-foreground">• {note}</p>)}
                        {live?.rejections.length ? (
                            <p className="text-xs text-muted-foreground">Rejected: {live.rejections.map((r) => r.reasons[0]).join(" ")}</p>
                        ) : null}
                    </div>
                )}

                {followError && <p className="text-sm text-destructive">Live updates are unavailable. Check the Runs page for this run.</p>}

                <DialogFooter>
                    {finished && drafts > 0 && (
                        <Button asChild>
                            <Link href={Routes.AUTOPILOT_DRAFTS}><FileText className="mr-2 h-4 w-4" /> Review drafts</Link>
                        </Button>
                    )}
                    {active && (
                        <Button variant="outline" onClick={() => runId && cancelRun.mutate(runId)} disabled={cancelRun.isPending || live?.cancelRequested || cancelRun.data?.status === "cancelling" || cancelRun.data?.status === "cancelled"}>
                            {cancelRun.isPending || live?.cancelRequested || cancelRun.data?.status === "cancelling" ? "Cancelling…" : "Cancel run"}
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => close(false)}>Close</Button>
                    {!runId && (
                        <Button onClick={start} disabled={startRun.isPending || !userId || !hasSources}>
                            <Play className="mr-2 h-4 w-4" /> {startRun.isPending ? "Starting…" : "Start"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
