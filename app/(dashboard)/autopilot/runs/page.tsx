"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Clock3, History, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav";
import { RunSteps, statsSummary } from "@/components/features/autopilot/RunSteps";
import { useCancelRun, useRetryRun, useRuns } from "@/lib/query/hooks/use-research";
import { Routes } from "@/lib/routes";
import type { RunStatus, WorkflowRun } from "@/types/research";

const STATUS: Record<RunStatus, { label: string; variant: "published" | "draft" | "scheduled" | "outline"; tone: string }> = {
    queued: { label: "Queued", variant: "outline", tone: "text-[#667482]" },
    completed: { label: "Completed", variant: "published", tone: "text-[#357d72]" },
    partial: { label: "Stopped early", variant: "draft", tone: "text-[#a67b37]" },
    running: { label: "Running", variant: "scheduled", tone: "text-[#5578a8]" },
    failed: { label: "Failed", variant: "outline", tone: "text-[#b95656]" },
    cancelled: { label: "Cancelled", variant: "outline", tone: "text-[#89939a]" },
    skipped: { label: "Skipped", variant: "draft", tone: "text-[#a67b37]" },
};

const TRIGGER = { manual: "Manual", scheduled: "Scheduled", retry: "Retry" } as const;

function RunRow({ run, onCancel, onRetry, cancelling, retrying }: {
    run: WorkflowRun;
    onCancel: () => void;
    onRetry: () => void;
    cancelling: boolean;
    retrying: boolean;
}) {
    const [open, setOpen] = useState(false);
    const badge = STATUS[run.status] ?? STATUS.failed;
    const summary = statsSummary(run.stats);
    const seconds = run.startedAt && run.finishedAt ? Math.round((run.finishedAt.getTime() - run.startedAt.getTime()) / 1000) : undefined;
    const canCancel = run.status === "queued" || run.status === "running";
    const canRetry = ["failed", "partial", "skipped", "cancelled"].includes(run.status);

    return (
        <Card className="overflow-hidden rounded-xl border border-[#e2e6ea] bg-white p-0 shadow-none">
            <button type="button" className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-[#fafcfb] md:p-4" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f6f5] text-[#6d817c]">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-xs font-semibold text-[#303a40]">{run.personaName ?? "Persona"}</span>
                        <Badge variant={badge.variant} className="text-[9px]">{badge.label}</Badge>
                        <span className="rounded-md border border-[#e8ecee] px-1.5 py-0.5 text-[9px] text-[#849097]">{TRIGGER[run.trigger] ?? run.trigger}</span>
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-[#89939a]">
                        {(run.startedAt ?? run.createdAt)?.toLocaleString() ?? "Time unavailable"}{seconds !== undefined ? ` · ${seconds}s` : ""}{summary ? ` · ${summary}` : ""}
                    </span>
                </span>
                {run.status === "running" && <span className="hidden items-center gap-1.5 text-[10px] font-medium text-[#5578a8] sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6a8fbd]" />In progress</span>}
                <span className={`hidden text-[10px] font-semibold sm:block ${badge.tone}`}>{badge.label}</span>
            </button>

            {open && (
                <div className="grid gap-5 border-t border-[#edf0f2] bg-[#fbfcfc] p-4 md:grid-cols-2 md:p-5">
                    <div>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a858c]">Run progress</p>
                        <RunSteps steps={run.steps} compact />
                    </div>
                    <div className="space-y-3 text-xs">
                        <p className="font-medium text-[#66727a]">
                            {run.stats.aiCalls ?? 0} AI call{(run.stats.aiCalls ?? 0) === 1 ? "" : "s"} · {run.stats.credits ?? 0} credits · persona v{run.personaVersion}
                        </p>
                        {run.status === "skipped" && run.reason && <p className="text-[#59656d]">Why it was skipped: {run.reason}</p>}
                        {run.retryOf && <p className="text-[#7f8a91]">Retry of run {run.retryOf}</p>}
                        {run.notes.length > 0 && <div><p className="mb-1 font-semibold text-[#48545b]">Notes</p>{run.notes.map((note, index) => <p key={index} className="text-[#758087]">• {note}</p>)}</div>}
                        {run.rejections.length > 0 && <div><p className="mb-1 font-semibold text-[#48545b]">Rejected drafts</p>{run.rejections.map((rejection, index) => <p key={index} className="text-[#758087]">• {rejection.topic}: {rejection.reasons.join(" ")}</p>)}</div>}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {canCancel && <Button variant="outline" size="sm" onClick={onCancel} disabled={cancelling || run.cancelRequested} className="h-8 rounded-lg border-[#dfe5e7] bg-white text-[10px] text-[#4d5960]">{cancelling || run.cancelRequested ? "Cancelling…" : "Cancel run"}</Button>}
                            {canRetry && <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying} className="h-8 rounded-lg border-[#d5e3de] bg-white text-[10px] text-[#357d72]">{retrying ? "Queuing…" : "Run again"}</Button>}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

export default function RunsPage() {
    const { user } = useAuth();
    const { data: runs = [], isLoading } = useRuns(user?.uid);
    const cancel = useCancelRun(user?.uid);
    const retry = useRetryRun(user?.uid);

    const active = runs.filter((run) => run.status === "queued" || run.status === "running").length;
    const completed = runs.filter((run) => run.status === "completed").length;
    const needsAttention = runs.filter((run) => run.status === "failed" || run.status === "skipped" || run.status === "partial").length;
    const draftsGenerated = runs.reduce((total, run) => total + (run.stats.draftsGenerated ?? 0), 0);
    const metrics = [
        { label: "Total runs", value: runs.length, note: "Across all personas", icon: History, tone: "#5578a8", tint: "#edf2fa" },
        { label: "In progress", value: active, note: "Queued or running", icon: Clock3, tone: "#5578a8", tint: "#edf2fa" },
        { label: "Drafts prepared", value: draftsGenerated, note: "From completed research", icon: Sparkles, tone: "#357d72", tint: "#e8f3f0" },
        { label: "Needs attention", value: needsAttention, note: "Failed, skipped or partial", icon: AlertTriangle, tone: needsAttention ? "#b95656" : "#77818a", tint: needsAttention ? "#faeeee" : "#f2f4f4" },
    ];

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-5 text-[#20242b] md:space-y-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#5578a8]" />Operations / Research Intelligence
                    </div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">Research Intelligence</h1>
                    <p className="mt-1 text-sm text-[#748087]">Follow each research run from discovery through sourced draft generation.</p>
                </div>
                <Button asChild variant="outline" className="h-9 self-start rounded-lg border-[#dfe4e7] bg-white px-3 text-xs text-[#46515a] hover:bg-[#f5f7f7] sm:self-auto">
                    <Link href={Routes.AUTOPILOT_DRAFTS}><Search className="mr-2 h-4 w-4" />Review drafts<ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                </Button>
            </section>

            <AutopilotNav />

            <section aria-label="Research run metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(({ label, value, note, icon: Icon, tone, tint }) => (
                    <Card key={label} className="rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-[#6c777f]">{label}</p>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: tint, color: tone }}><Icon className="h-4 w-4" /></span>
                        </div>
                        {isLoading ? <Skeleton className="mt-2 h-7 w-16 rounded-md" /> : <p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.04em] text-[#20242b]">{value}</p>}
                        <p className="mt-2 text-[11px] text-[#89939a]">{note}</p>
                    </Card>
                ))}
            </section>

            <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-[#283139]">Research run history</h2>
                        <p className="mt-1 text-[11px] text-[#89939a]">Expand a run to inspect its steps, notes, and rejected drafts.</p>
                    </div>
                    {!isLoading && <span className="text-[10px] text-[#89939a]">{runs.length} run{runs.length === 1 ? "" : "s"}</span>}
                </div>

                {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[66px] rounded-xl" />)}</div>
                ) : runs.length === 0 ? (
                    <Card className="flex min-h-[250px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#dfe5e7] bg-white p-8 text-center shadow-none">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf2fa] text-[#5578a8]"><History className="h-5 w-5" /></span>
                        <p className="text-sm font-semibold text-[#38434a]">No research runs yet</p>
                        <p className="max-w-sm text-xs leading-relaxed text-[#7c878e]">Start research from an active persona. Run history and its sources will appear here.</p>
                        <Link href={Routes.AUTOPILOT} className="mt-1 text-xs font-semibold text-[#357d72] hover:text-[#286c63]">Go to personas<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
                    </Card>
                ) : (
                    <div className="space-y-2">{runs.map((run) => (
                        <RunRow key={run.id} run={run} onCancel={() => cancel.mutate(run.id)} onRetry={() => retry.mutate(run.id)} cancelling={cancel.isPending && cancel.variables === run.id} retrying={retry.isPending && retry.variables === run.id} />
                    ))}</div>
                )}
            </section>

            <div className="flex items-start gap-2 rounded-lg border border-[#e4ebe8] bg-[#f8fbfa] p-3 text-[10px] leading-relaxed text-[#6e7e79]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#357d72]" />Research creates drafts for review only. Nothing is published automatically.
            </div>
        </div>
    );
}
