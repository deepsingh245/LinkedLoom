"use client"

import Link from "next/link"
import { Inbox, Archive, ArchiveRestore, MoreVertical, Pause, Pencil, Play, Search, Sparkles, Trash2, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Routes } from "@/lib/routes"
import type { Persona, PersonaStatus } from "@/types/autopilot"
import { useState } from "react"

const statusBadge: Record<PersonaStatus, { label: string; variant: "published" | "draft" | "outline" }> = {
    active: { label: "Active", variant: "published" },
    paused: { label: "Paused", variant: "draft" },
    archived: { label: "Archived", variant: "outline" },
}

interface PersonaCardProps {
    persona: Persona
    busy?: boolean
    onStatusChange: (status: PersonaStatus) => void
    onDelete: () => void
    onTest?: () => void
    onResearch?: () => void
    onDemo?: () => void
    /** Open the auto-publish on/off dialog. */
    onApprovalMode?: () => void
}

export function PersonaCard({ persona, busy, onStatusChange, onDelete, onTest, onResearch, onDemo, onApprovalMode }: PersonaCardProps) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const badge = statusBadge[persona.status]
    const archived = persona.status === "archived"
    const windows = persona.publishing.postingWindows.map((w) => `${w.start}–${w.end}`).join(", ")
    const autoPublish = persona.publishing.approvalMode === "automatic"

    return (
        <Card className={`flex flex-col gap-4 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5 ${archived ? "opacity-65" : ""}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{persona.name}</h3>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {autoPublish && <Badge variant="scheduled" className="gap-1"><Zap className="h-3 w-3" />Auto-publish</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{persona.identity.role}</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={busy} aria-label="Persona actions">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!archived && (
                            <DropdownMenuItem asChild>
                                <Link href={`${Routes.AUTOPILOT}/${persona.id}`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link>
                            </DropdownMenuItem>
                        )}
                        {persona.status === "active" && onResearch && (
                            <DropdownMenuItem onClick={onResearch}><Search className="mr-2 h-4 w-4" /> Run research</DropdownMenuItem>
                        )}
                        {!archived && onDemo && (
                            <DropdownMenuItem onClick={onDemo}><Inbox className="mr-2 h-4 w-4" /> Try a demo</DropdownMenuItem>
                        )}
                        {!archived && onApprovalMode && (
                            <DropdownMenuItem onClick={onApprovalMode}><Zap className="mr-2 h-4 w-4" /> {autoPublish ? "Turn off auto-publish" : "Turn on auto-publish…"}</DropdownMenuItem>
                        )}
                        {!archived && onTest && (
                            <DropdownMenuItem onClick={onTest}><Sparkles className="mr-2 h-4 w-4" /> Test generate</DropdownMenuItem>
                        )}
                        {persona.status === "active" && (
                            <DropdownMenuItem onClick={() => onStatusChange("paused")}><Pause className="mr-2 h-4 w-4" /> Pause</DropdownMenuItem>
                        )}
                        {persona.status === "paused" && (
                            <DropdownMenuItem onClick={() => onStatusChange("active")}><Play className="mr-2 h-4 w-4" /> Resume</DropdownMenuItem>
                        )}
                        {archived ? (
                            <>
                                <DropdownMenuItem onClick={() => onStatusChange("paused")}><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete permanently
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onStatusChange("archived")}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {persona.research.topics.slice(0, 6).map((topic) => (
                    <span key={topic} className="rounded-md border border-[#e7ecea] bg-[#f5f8f7] px-2 py-1 text-[10px] text-[#65736f]">
                        {topic}
                    </span>
                ))}
                {persona.research.topics.length > 6 && (
                    <span className="px-1 text-xs text-muted-foreground">+{persona.research.topics.length - 6}</span>
                )}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>{persona.publishing.postsPerDay} post{persona.publishing.postsPerDay === 1 ? "" : "s"}/day · LinkedIn</span>
                <span className="truncate text-right" title={persona.publishing.timezone}>{windows || "No posting window"}</span>
                <span className="col-span-2">
                    {persona.research.autoRun
                        ? persona.nextRunAt
                            ? `Auto research: next run ${persona.nextRunAt.toLocaleString()}`
                            : "Auto research on · no run scheduled"
                        : "Auto research off"}
                </span>
                {persona.lastRunStatus && <span className="col-span-2">Last run: {persona.lastRunStatus}</span>}
                <span>{persona.ai.connectionId ? "Your AI key" : "LinkedLoom credits"} · {autoPublish ? "auto-publish" : "manual approval"}</span>
                <span className="text-right">v{persona.version}</span>
            </div>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{persona.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>This permanently deletes the persona configuration. This can’t be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
