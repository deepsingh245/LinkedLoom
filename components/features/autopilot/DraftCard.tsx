"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, FilePlus2, RotateCcw, ShieldCheck, X } from "lucide-react";
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
}

const MAX = 3000;

export function DraftCard({ item, personaName, busy, onSave, onReject, onRestore, onExport }: DraftCardProps) {
    const saved = item.variants.linkedin.text;
    const [text, setText] = useState(saved);
    const [showSources, setShowSources] = useState(false);
    const rejected = item.approvalStatus === "rejected";
    const dirty = text.trim() !== saved;
    const tags = item.hashtags.map((hashtag) => `#${hashtag}`).join(" ");

    return (
        <Card className="space-y-4 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f2] pb-3">
                <Badge variant={rejected ? "outline" : "scheduled"} className="text-[9px]">{rejected ? "Rejected" : "Needs review"}</Badge>
                {item.demo ? (
                    <Badge variant="draft" className="text-[9px]">Demo · not researched</Badge>
                ) : (
                    <Badge variant="published" className="text-[9px]"><ShieldCheck className="mr-1 h-3 w-3" />Fact-checked · {item.qualityScore}/100</Badge>
                )}
                {item.edited && <Badge variant="draft" className="text-[9px]">Edited</Badge>}
                {item.exportedPostId && <Badge variant="outline" className="text-[9px]">In your drafts</Badge>}
                <span className="ml-auto text-[10px] text-[#89939a]">{personaName ? `${personaName} · ` : ""}{item.createdAt?.toLocaleString() ?? "Date unavailable"}</span>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b959c]">{item.demo ? "Demo angle" : "Research topic"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#38434a]">{item.topic}</p>
                </div>
                <span className="rounded-md border border-[#e4ebe8] bg-[#f8fbfa] px-2 py-1 text-[9px] font-medium text-[#62766f]">Manual approval</span>
            </div>

            <div className="space-y-1.5">
                <Textarea value={text} rows={9} maxLength={MAX} disabled={busy} onChange={(event) => setText(event.target.value)} aria-label="Post text" className="min-h-[180px] resize-y rounded-lg border-[#dfe5e7] bg-white text-[13px] leading-relaxed text-[#303a40] placeholder:text-[#9ba5aa] focus-visible:ring-[#357d72]/20" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#89939a]">
                    <span className="text-[#357d72]">{tags}</span>
                    <span>{text.length}/{MAX}</span>
                </div>
            </div>

            {item.demo ? (
                <p className="rounded-lg border border-dashed border-[#e2e6ea] bg-[#fafbfb] p-3 text-[11px] leading-relaxed text-[#6e7b81]">
                    This is a demo draft. Real drafts list their sources with quoted evidence here and carry a fact-check score. Try editing, rejecting or sending it to your drafts.
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
                {dirty && !rejected && <Button size="sm" disabled={busy || text.trim().length < 40} onClick={() => onSave(text.trim())} className="h-8 rounded-lg bg-[#357d72] px-3 text-[10px] text-white hover:bg-[#286c63]"><Check className="mr-1 h-3.5 w-3.5" />Save changes</Button>}
                {!rejected && (
                    <Button size="sm" variant={dirty ? "outline" : "default"} disabled={busy || dirty || !!item.exportedPostId} onClick={onExport}
                        className={dirty || item.exportedPostId ? "h-8 rounded-lg border-[#dfe5e7] bg-white px-3 text-[10px] text-[#77828a]" : "h-8 rounded-lg bg-[#357d72] px-3 text-[10px] text-white hover:bg-[#286c63]"}
                        title={dirty ? "Save your changes first" : undefined}>
                        <FilePlus2 className="mr-1 h-3.5 w-3.5" />{item.exportedPostId ? "Sent to drafts" : "Send to my drafts"}
                    </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 rounded-lg border-[#dfe5e7] bg-white px-3 text-[10px] text-[#59656d]" onClick={async () => {
                    await navigator.clipboard.writeText(tags ? `${saved}\n\n${tags}` : saved);
                    successToast("Copied.");
                }}>
                    <Copy className="mr-1 h-3.5 w-3.5" />Copy
                </Button>
                {rejected ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={onRestore} className="h-8 rounded-lg border-[#dfe5e7] bg-white px-3 text-[10px] text-[#59656d]"><RotateCcw className="mr-1 h-3.5 w-3.5" />Restore</Button>
                ) : (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={onReject} className="h-8 rounded-lg px-3 text-[10px] text-[#9c5d5d] hover:bg-[#fff3f3]"><X className="mr-1 h-3.5 w-3.5" />Reject</Button>
                )}
            </div>
        </Card>
    );
}
