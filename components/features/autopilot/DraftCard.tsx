"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, FilePlus2, RotateCcw, ShieldCheck, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { successToast } from "@/lib/toast"
import type { ContentItem } from "@/types/research"

interface DraftCardProps {
    item: ContentItem
    personaName?: string
    busy?: boolean
    onSave: (text: string) => void
    onReject: () => void
    onRestore: () => void
    onExport: () => void
}

const MAX = 3000

export function DraftCard({ item, personaName, busy, onSave, onReject, onRestore, onExport }: DraftCardProps) {
    const saved = item.variants.linkedin.text
    const [text, setText] = useState(saved)
    const [showSources, setShowSources] = useState(false)
    const rejected = item.approvalStatus === "rejected"
    const dirty = text.trim() !== saved
    const tags = item.hashtags.map((h) => `#${h}`).join(" ")

    return (
        <Card className={`p-5 space-y-4 ${rejected ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={rejected ? "outline" : "scheduled"}>{rejected ? "Rejected" : "Needs review"}</Badge>
                <Badge variant="published"><ShieldCheck className="mr-1 h-3 w-3" /> Fact-checked · {item.qualityScore}/100</Badge>
                {item.edited && <Badge variant="draft">Edited</Badge>}
                {item.exportedPostId && <Badge variant="outline">In your drafts</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                    {personaName ? `${personaName} · ` : ""}{item.createdAt?.toLocaleString()}
                </span>
            </div>

            <p className="text-sm font-medium text-muted-foreground">{item.topic}</p>

            <div className="space-y-1">
                <Textarea
                    value={text}
                    rows={9}
                    maxLength={MAX}
                    disabled={busy}
                    onChange={(e) => setText(e.target.value)}
                    aria-label="Post text"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="text-primary">{tags}</span>
                    <span>{text.length}/{MAX}</span>
                </div>
            </div>

            <div>
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => setShowSources((v) => !v)}>
                    {showSources ? "Hide" : "Show"} {item.sources.length} sources and evidence
                </button>
                {showSources && (
                    <ul className="mt-3 space-y-3">
                        {item.sources.map((s) => (
                            <li key={s.url} className="rounded-xl border border-border bg-accent/30 p-3 text-sm">
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
                                    {s.title || s.domain} <ExternalLink className="h-3 w-3" />
                                </a>
                                <p className="text-xs text-muted-foreground">
                                    {s.domain}{s.publishedAt ? ` · ${s.publishedAt.toLocaleDateString()}` : ""}
                                </p>
                                {s.quote && <p className="mt-2 border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">“{s.quote}”</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {dirty && !rejected && (
                    <Button size="sm" disabled={busy || text.trim().length < 40} onClick={() => onSave(text.trim())}>
                        <Check className="mr-1 h-4 w-4" /> Save changes
                    </Button>
                )}
                {!rejected && (
                    <Button size="sm" variant={dirty ? "outline" : "default"} disabled={busy || dirty || !!item.exportedPostId} onClick={onExport}
                        title={dirty ? "Save your changes first" : undefined}>
                        <FilePlus2 className="mr-1 h-4 w-4" /> {item.exportedPostId ? "Sent to drafts" : "Send to my drafts"}
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                        await navigator.clipboard.writeText(tags ? `${saved}\n\n${tags}` : saved)
                        successToast("Copied.")
                    }}
                >
                    <Copy className="mr-1 h-4 w-4" /> Copy
                </Button>
                {rejected ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={onRestore}><RotateCcw className="mr-1 h-4 w-4" /> Restore</Button>
                ) : (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}><X className="mr-1 h-4 w-4" /> Reject</Button>
                )}
            </div>
        </Card>
    )
}
