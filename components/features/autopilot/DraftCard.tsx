"use client";

import { useState } from "react";
import { AlertTriangle, CalendarClock, CalendarX, Check, Copy, ExternalLink, FilePlus2, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { successToast } from "@/lib/toast";
import type { ContentItem } from "@/types/research";

interface DraftCardProps {
    item: ContentItem;
    personaName?: string;
    busy?: boolean;
    onSave: (text: string) => void;
    onReject: () => void;
    onRestore: () => void;
    onExport: () => void;
    /** Open the approve / reschedule dialog. */
    onApprove: () => void;
    onUnschedule: () => void;
    /** Answer "did this post go out?" for a post we couldn't confirm. */
    onResolve: (outcome: "published" | "retry" | "failed") => void;
}

const MAX = 3000;
const GHOST = "h-8 rounded-lg border-[#dfe5e7] bg-white px-3 text-[10px] text-[#59656d]";
const PRIMARY = "h-8 rounded-lg bg-[#357d72] px-3 text-[10px] text-white hover:bg-[#286c63]";

/** What the card shows for each stage of a draft's life. */
function stageOf(item: ContentItem) {
    if (item.approvalStatus === "rejected") return { key: "rejected", label: "Rejected", variant: "outline" as const };
    if (item.approvalStatus !== "approved") return { key: "pending", label: "Needs review", variant: "scheduled" as const };
    switch (item.state) {
        case "PUBLISHING": return { key: "publishing", label: "Publishing…", variant: "scheduled" as const };
        case "PUBLISHED": return { key: "published", label: "Published", variant: "published" as const };
        case "FAILED": return { key: "failed", label: "Not published", variant: "outline" as const };
        case "RECONCILIATION_REQUIRED": return { key: "check", label: "Needs your check", variant: "draft" as const };
        default: return { key: "scheduled", label: item.scheduledFor ? `Scheduled · ${item.scheduledFor.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Scheduled", variant: "scheduled" as const };
    }
}

export function DraftCard({ item, personaName, busy, onSave, onReject, onRestore, onExport, onApprove, onUnschedule, onResolve }: DraftCardProps) {
    const saved = item.variants.linkedin.text;
    const [text, setText] = useState(saved);
    const [showSources, setShowSources] = useState(false);
    const stage = stageOf(item);
    const rejected = stage.key === "rejected";
    const pending = stage.key === "pending";
    // Text can change while the draft is in review or still waiting in the queue.
    const editable = pending || stage.key === "scheduled";
    const dirty = text.trim() !== saved;
    const tags = item.hashtags.map((hashtag) => `#${hashtag}`).join(" ");

    return (
        <Card className="space-y-4 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f2] pb-3">
                <Badge variant={stage.variant} className="text-[9px]">{stage.label}</Badge>
                {item.demo ? (
                    <Badge variant="draft" className="text-[9px]">Demo · not researched</Badge>
                ) : (
                    <Badge variant="published" className="text-[9px]"><ShieldCheck className="mr-1 h-3 w-3" />Fact-checked · {item.qualityScore}/100</Badge>
                )}
                {item.edited && <Badge variant="draft" className="text-[9px]">Edited</Badge>}
                {item.exportedPostId && pending && <Badge variant="outline" className="text-[9px]">In your drafts</Badge>}
                <span className="ml-auto text-[10px] text-[#89939a]">{personaName ? `${personaName} · ` : ""}{item.createdAt?.toLocaleString() ?? "Date unavailable"}</span>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b959c]">{item.demo ? "Demo angle" : "Research topic"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#38434a]">{item.topic}</p>
                </div>
                <span className="rounded-md border border-[#e4ebe8] bg-[#f8fbfa] px-2 py-1 text-[9px] font-medium text-[#62766f]">
                    {item.approvedBy === "autopilot" ? "Scheduled by auto-publish" : "Manual approval"}
                </span>
            </div>

            {stage.key === "check" && (
                <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-orange-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {item.publishError ?? "We couldn't confirm whether LinkedIn published this post."} Open your LinkedIn profile, then tell us.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={busy} onClick={() => onResolve("published")} className={PRIMARY}><Check className="mr-1 h-3.5 w-3.5" />Yes, it&apos;s live</Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onResolve("retry")} className={GHOST}><Send className="mr-1 h-3.5 w-3.5" />No – publish it now</Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onResolve("failed")} className="h-8 rounded-lg px-3 text-[10px] text-[#9c5d5d] hover:bg-[#fff3f3]">No – leave it</Button>
                    </div>
                </div>
            )}
            {stage.key === "failed" && item.publishError && (
                <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] leading-relaxed text-red-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item.publishError}
                </p>
            )}
            {stage.key === "published" && item.publishedUrl && (
                <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#357d72] hover:underline">
                    View on LinkedIn<ExternalLink className="h-3 w-3" />
                </a>
            )}

            <div className="space-y-1.5">
                <Textarea value={text} rows={9} maxLength={MAX} disabled={busy || !editable} onChange={(event) => setText(event.target.value)} aria-label="Post text" className="min-h-[180px] resize-y rounded-lg border-[#dfe5e7] bg-white text-[13px] leading-relaxed text-[#303a40] placeholder:text-[#9ba5aa] focus-visible:ring-[#357d72]/20" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#89939a]">
                    <span className="text-[#357d72]">{tags}</span>
                    <span>{text.length}/{MAX}</span>
                </div>
            </div>

            {item.demo ? (
                <p className="rounded-lg border border-dashed border-[#e2e6ea] bg-[#fafbfb] p-3 text-[11px] leading-relaxed text-[#6e7b81]">
                    This is a demo draft. Real drafts list their sources with quoted evidence here and carry a fact-check score, and only real drafts can be scheduled. Try editing, rejecting or sending it to your drafts.
                </p>
            ) : (
            <div>
                <button type="button" className="text-xs font-semibold text-[#357d72] hover:underline" onClick={() => setShowSources((value) => !value)}>
                    {showSources ? "Hide" : "Show"} {item.sources.length} sources and evidence
                </button>
                {showSources && (
                    <ul className="mt-3 space-y-2">
                        {item.sources.map((source) => (
                            <li key={source.url} className="rounded-lg border border-[#e5e9eb] bg-[#fafbfb] p-3">
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#38434a] hover:text-[#357d72] hover:underline">
                                    {source.title || source.domain}<ExternalLink className="h-3 w-3" />
                                </a>
                                <p className="mt-0.5 text-[10px] text-[#89939a]">{source.domain}{source.publishedAt ? ` · ${source.publishedAt.toLocaleDateString()}` : ""}</p>
                                {source.quote && <p className="mt-2 border-l-2 border-[#a8c8be] pl-3 text-[11px] italic text-[#6e7b81]">“{source.quote}”</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-[#edf0f2] pt-3">
                {dirty && editable && <Button size="sm" disabled={busy || text.trim().length < 40} onClick={() => onSave(text.trim())} className={PRIMARY}><Check className="mr-1 h-3.5 w-3.5" />Save changes</Button>}

                {pending && !item.demo && (
                    <Button size="sm" variant={dirty ? "outline" : "default"} disabled={busy || dirty} onClick={onApprove} title={dirty ? "Save your changes first" : undefined}
                        className={dirty ? GHOST : PRIMARY}>
                        <Send className="mr-1 h-3.5 w-3.5" />Approve &amp; schedule
                    </Button>
                )}
                {pending && (
                    <Button size="sm" variant="outline" disabled={busy || dirty || !!item.exportedPostId} onClick={onExport} className={GHOST} title={dirty ? "Save your changes first" : undefined}>
                        <FilePlus2 className="mr-1 h-3.5 w-3.5" />{item.exportedPostId ? "Sent to drafts" : "Send to my drafts"}
                    </Button>
                )}

                {(stage.key === "scheduled" || stage.key === "failed") && (
                    <>
                        <Button size="sm" variant="outline" disabled={busy || dirty} onClick={onApprove} className={GHOST}>
                            <CalendarClock className="mr-1 h-3.5 w-3.5" />{stage.key === "failed" ? "Schedule again" : "Reschedule"}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={onUnschedule} className="h-8 rounded-lg px-3 text-[10px] text-[#9c5d5d] hover:bg-[#fff3f3]">
                            <CalendarX className="mr-1 h-3.5 w-3.5" />Unschedule
                        </Button>
                    </>
                )}

                <Button size="sm" variant="outline" className={GHOST} onClick={async () => {
                    await navigator.clipboard.writeText(tags ? `${saved}\n\n${tags}` : saved);
                    successToast("Copied.");
                }}>
                    <Copy className="mr-1 h-3.5 w-3.5" />Copy
                </Button>
                {rejected && <Button size="sm" variant="outline" disabled={busy} onClick={onRestore} className={GHOST}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restore</Button>}
                {pending && <Button size="sm" variant="ghost" disabled={busy} onClick={onReject} className="h-8 rounded-lg px-3 text-[10px] text-[#9c5d5d] hover:bg-[#fff3f3]"><X className="mr-1 h-3.5 w-3.5" />Reject</Button>}
            </div>
        </Card>
    );
}
