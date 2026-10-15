"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/providers/auth-provider"
import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav"
import { RunSteps, statsSummary } from "@/components/features/autopilot/RunSteps"
import { useCancelRun, useRetryRun, useRuns } from "@/lib/query/hooks/use-research"
import type { RunStatus, WorkflowRun } from "@/types/research"

const STATUS: Record<RunStatus, { label: string; variant: "published" | "draft" | "scheduled" | "outline" }> = {
    queued: { label: "Queued", variant: "outline" },
    completed: { label: "Completed", variant: "published" },
    partial: { label: "Stopped early", variant: "draft" },
    running: { label: "Running", variant: "scheduled" },
    failed: { label: "Failed", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "outline" },
    skipped: { label: "Skipped", variant: "draft" },
}

const TRIGGER = { manual: "Manual", scheduled: "Scheduled", retry: "Retry" } as const

function RunRow({ run, onCancel, onRetry, cancelling, retrying }: {
    run: WorkflowRun
    onCancel: () => void
    onRetry: () => void
    cancelling: boolean
    retrying: boolean
}) {
    const [open, setOpen] = useState(false)
    const badge = STATUS[run.status] ?? STATUS.failed
    const summary = statsSummary(run.stats)
    const seconds = run.startedAt && run.finishedAt ? Math.round((run.finishedAt.getTime() - run.startedAt.getTime()) / 1000) : undefined
    const canCancel = run.status === "queued" || run.status === "running"
    const canRetry = ["failed", "partial", "skipped", "cancelled"].includes(run.status)

    return (
        <Card className="p-4">
            <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{run.personaName ?? "Persona"}</span>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <Badge variant="outline">{TRIGGER[run.trigger] ?? run.trigger}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {(run.startedAt ?? run.createdAt)?.toLocaleString()}{seconds !== undefined ? ` · ${seconds}s` : ""}{summary ? ` · ${summary}` : ""}
                    </p>
                </div>
            </button>

            {open && (
                <div className="mt-4 grid gap-6 border-t border-border pt-4 md:grid-cols-2">
                    <RunSteps steps={run.steps} compact />
                    <div className="space-y-3 text-sm">
                        <p className="text-xs text-muted-foreground">
                            {run.stats.aiCalls ?? 0} AI call{(run.stats.aiCalls ?? 0) === 1 ? "" : "s"} · {run.stats.credits ?? 0} credits · persona v{run.personaVersion}
                        </p>
                        {run.status === "skipped" && run.reason && <p className="text-sm text-foreground">Why it was skipped: {run.reason}</p>}
                        {run.retryOf && <p className="text-xs text-muted-foreground">Retry of run {run.retryOf}</p>}
                        {run.notes.length > 0 && (
                            <div>
                                <p className="mb-1 font-medium text-foreground">Notes</p>
                                {run.notes.map((n, i) => <p key={i} className="text-xs text-muted-foreground">• {n}</p>)}
                            </div>
                        )}
                        {run.rejections.length > 0 && (
                            <div>
                                <p className="mb-1 font-medium text-foreground">Rejected drafts</p>
                                {run.rejections.map((r, i) => (
                                    <p key={i} className="text-xs text-muted-foreground">• {r.topic}: {r.reasons.join(" ")}</p>
                                ))}
                            </div>
                        )}
                        {canCancel && <Button variant="outline" size="sm" onClick={onCancel} disabled={cancelling || run.cancelRequested}>{cancelling || run.cancelRequested ? "Cancelling…" : "Cancel run"}</Button>}
                        {canRetry && <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>{retrying ? "Queuing…" : "Run again"}</Button>}
                    </div>
                </div>
            )}
        </Card>
    )
}

export default function RunsPage() {
    const { user } = useAuth()
    const { data: runs = [], isLoading } = useRuns(user?.uid)
    const cancel = useCancelRun(user?.uid)
    const retry = useRetryRun(user?.uid)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Autopilot</h1>
                <p className="text-muted-foreground">Every research run: what was found, what was kept, what was rejected and why.</p>
            </div>
            <AutopilotNav />

            {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
            ) : runs.length === 0 ? (
                <Card className="flex flex-col items-center gap-2 p-12 text-center">
                    <History className="h-9 w-9 text-primary" />
                    <p className="font-medium text-foreground">No runs yet</p>
                    <p className="text-sm text-muted-foreground">Run research from a persona&apos;s menu to see its history here.</p>
                </Card>
            ) : (
                <div className="space-y-3">{runs.map((r) => (
                    <RunRow
                        key={r.id}
                        run={r}
                        onCancel={() => cancel.mutate(r.id)}
                        onRetry={() => retry.mutate(r.id)}
                        cancelling={cancel.isPending && cancel.variables === r.id}
                        retrying={retry.isPending && retry.variables === r.id}
                    />
                ))}</div>
            )}
        </div>
    )
}
