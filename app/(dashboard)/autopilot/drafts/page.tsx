"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCheck, FileCheck2, FileText, Search, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav";
import { DraftCard } from "@/components/features/autopilot/DraftCard";
import { ApproveDialog } from "@/components/features/autopilot/ApproveDialog";
import { usePersonas } from "@/lib/query/hooks/use-autopilot";
import {
    useApproveContent, useContentItems, useExportContentToDraft, useResolvePublishCheck, useSetContentStatus, useUnscheduleContent, useUpdateContentItem,
} from "@/lib/query/hooks/use-research";
import type { ContentItem } from "@/types/research";
import { QueryError } from "@/components/features/autopilot/QueryError";
import { Routes } from "@/lib/routes";

type Filter = "pending" | "scheduled" | "published" | "rejected" | "all";

/** Which tab a draft belongs to. Approved drafts are "scheduled" until they're published. */
const bucketOf = (item: ContentItem): Exclude<Filter, "all"> =>
    item.approvalStatus === "rejected" ? "rejected"
        : item.approvalStatus !== "approved" ? "pending"
            : item.state === "PUBLISHED" ? "published" : "scheduled";

export default function DraftsPage() {
    const { user } = useAuth();
    const { data: items = [], isLoading, error, refetch } = useContentItems(user?.uid);
    const { data: personas = [] } = usePersonas(user?.uid);
    const update = useUpdateContentItem(user?.uid);
    const setStatus = useSetContentStatus(user?.uid);
    const exportDraft = useExportContentToDraft(user?.uid);
    const approve = useApproveContent(user?.uid);
    const unschedule = useUnscheduleContent(user?.uid);
    const resolve = useResolvePublishCheck(user?.uid);
    const [approving, setApproving] = useState<ContentItem | null>(null);
    const [filter, setFilter] = useState<Filter>("pending");
    const [personaFilter, setPersonaFilter] = useState("all");

    const visible = useMemo(
        () => items.filter((item) => (filter === "all" || bucketOf(item) === filter) && (personaFilter === "all" || item.personaId === personaFilter)),
        [items, filter, personaFilter],
    );
    const personaName = (id: string) => personas.find((persona) => persona.id === id)?.name;
    const postIdOf = (item: ContentItem) => item.scheduledPostId ?? `autopilot_${item.id}`;
    const busyId = (update.isPending && update.variables?.contentId) || (setStatus.isPending && setStatus.variables?.contentId) || (exportDraft.isPending && exportDraft.variables)
        || (unschedule.isPending && unschedule.variables) || (resolve.isPending && items.find((item) => postIdOf(item) === resolve.variables?.postId)?.id) || "";
    const count = (bucket: Exclude<Filter, "all">) => items.filter((item) => bucketOf(item) === bucket).length;
    const pendingCount = count("pending");
    const scheduledCount = count("scheduled");
    const publishedCount = count("published");
    const rejectedCount = count("rejected");
    const needsCheck = items.filter((item) => item.state === "RECONCILIATION_REQUIRED" || item.state === "FAILED").length;

    const metrics = [
        { label: "Needs review", value: pendingCount, note: "Waiting for your approval", icon: FileCheck2, tint: "#f7f2e9", color: "#a67b37" },
        { label: "Scheduled", value: scheduledCount, note: needsCheck ? `${needsCheck} need${needsCheck === 1 ? "s" : ""} your attention` : "Queued for LinkedIn", icon: CalendarClock, tint: "#eaf0fa", color: "#3d68a8" },
        { label: "Published", value: publishedCount, note: "Live on LinkedIn", icon: Send, tint: "#e8f3f0", color: "#357d72" },
        { label: "Rejected", value: rejectedCount, note: "Saved for reference or restore", icon: XCircle, tint: "#f7eef1", color: "#a6647b" },
    ];

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-5 text-[#20242b] md:space-y-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">Operations / Approval Inbox</div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">Review sourced drafts</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#748087]">Check the evidence, refine the copy, then approve to schedule it on LinkedIn in the persona&apos;s next free posting slot. Nothing publishes without your approval unless you turn on auto-publish for a persona.</p>
                </div>
                <Button asChild variant="outline" className="h-9 self-start rounded-lg border-[#dfe4e7] bg-white px-3 text-xs text-[#46515a] hover:bg-[#f5f7f7] sm:self-auto">
                    <Link href={Routes.AUTOPILOT}><Search className="mr-2 h-4 w-4" />Manage personas<ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                </Button>
            </section>

            <AutopilotNav />

            <section aria-label="Approval inbox summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map(({ label, value, note, icon: Icon, tint, color }) => (
                    <Card key={label} className="rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-[#6c777f]">{label}</p>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: tint, color }}><Icon className="h-4 w-4" /></span>
                        </div>
                        {isLoading ? <Skeleton className="mt-2 h-7 w-16 rounded-md" /> : <p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.04em] text-[#20242b]">{value}</p>}
                        <p className="mt-2 text-[11px] text-[#89939a]">{note}</p>
                    </Card>
                ))}
            </section>

            <section className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex w-fit max-w-full flex-wrap rounded-lg border border-[#e2e6ea] bg-white p-1" role="group" aria-label="Filter drafts by approval status">
                        {([
                            ["pending", "Needs review", pendingCount],
                            ["scheduled", "Scheduled", scheduledCount],
                            ["published", "Published", publishedCount],
                            ["rejected", "Rejected", rejectedCount],
                            ["all", "All drafts", items.length],
                        ] as const).map(([value, label, count]) => (
                            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition ${filter === value ? "bg-[#e8f3f0] text-[#286c63]" : "text-[#77828a] hover:bg-[#f5f7f7] hover:text-[#38434a]"}`}>
                                {label}<span className="ml-1.5 text-[9px] opacity-70">{count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={personaFilter} onValueChange={setPersonaFilter}>
                            <SelectTrigger className="h-9 w-[210px] rounded-lg border-[#dfe5e7] bg-white text-[11px] text-[#46515a]"><SelectValue placeholder="All personas" /></SelectTrigger>
                            <SelectContent className="border-border bg-popover text-popover-foreground">
                                <SelectItem value="all">All personas</SelectItem>
                                {personas.map((persona) => <SelectItem key={persona.id} value={persona.id}>{persona.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {!isLoading && <span className="min-w-16 text-right text-[10px] text-[#89939a]">{visible.length} shown</span>}
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-xl" />)}</div>
                ) : error ? (
                    <QueryError what="your drafts" error={error} onRetry={() => refetch()} />
                ) : visible.length === 0 ? (
                    <Card className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#dfe5e7] bg-white p-8 text-center shadow-none">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f6f5] text-[#71837e]">{items.length === 0 ? <FileText className="h-5 w-5" /> : <CheckCheck className="h-5 w-5" />}</span>
                        <div>
                            <h2 className="text-sm font-semibold text-[#38434a]">{items.length === 0 ? "No sourced drafts yet" : "No drafts match this filter"}</h2>
                            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#7c878e]">{items.length === 0 ? "Start a research run from an active persona. Its sourced drafts will arrive here for your review." : "Choose another status or persona to see more drafts."}</p>
                        </div>
                        {items.length === 0 && <Button asChild className="h-9 rounded-lg bg-[#357d72] px-3 text-xs text-white hover:bg-[#286c63]"><Link href={Routes.AUTOPILOT}>Go to personas</Link></Button>}
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {visible.map((item) => (
                            // Remount when the saved text changes so the editor resets to it.
                            <DraftCard
                                key={`${item.id}-${item.version}`}
                                item={item}
                                personaName={personaName(item.personaId)}
                                busy={busyId === item.id}
                                onSave={(text) => update.mutate({ contentId: item.id, text })}
                                onReject={() => setStatus.mutate({ contentId: item.id, status: "rejected" })}
                                onRestore={() => setStatus.mutate({ contentId: item.id, status: "pending" })}
                                onExport={() => exportDraft.mutate(item.id)}
                                onApprove={() => setApproving(item)}
                                onUnschedule={() => unschedule.mutate(item.id)}
                                onResolve={(outcome) => resolve.mutate({ postId: postIdOf(item), outcome })}
                            />
                        ))}
                    </div>
                )}
                <ApproveDialog
                    key={approving?.id ?? "none"}
                    item={approving}
                    personaName={approving ? personaName(approving.personaId) : undefined}
                    open={!!approving}
                    busy={approve.isPending}
                    onOpenChange={(open) => !open && setApproving(null)}
                    onConfirm={(scheduledFor) => {
                        if (!approving) return;
                        approve.mutate({ contentId: approving.id, scheduledFor }, { onSuccess: () => setApproving(null) });
                    }}
                />
            </section>
        </div>
    );
}
