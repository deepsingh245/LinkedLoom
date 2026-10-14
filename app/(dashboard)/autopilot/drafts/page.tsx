"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/components/providers/auth-provider"
import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav"
import { DraftCard } from "@/components/features/autopilot/DraftCard"
import { usePersonas } from "@/lib/query/hooks/use-autopilot"
import {
    useContentItems,
    useExportContentToDraft,
    useSetContentStatus,
    useUpdateContentItem,
} from "@/lib/query/hooks/use-research"
import { Routes } from "@/lib/routes"

type Filter = "pending" | "rejected" | "all"

export default function DraftsPage() {
    const { user } = useAuth()
    const { data: items = [], isLoading } = useContentItems(user?.uid)
    const { data: personas = [] } = usePersonas(user?.uid)
    const update = useUpdateContentItem(user?.uid)
    const setStatus = useSetContentStatus(user?.uid)
    const exportDraft = useExportContentToDraft(user?.uid)
    const [filter, setFilter] = useState<Filter>("pending")
    const [personaFilter, setPersonaFilter] = useState("all")

    const visible = useMemo(
        () =>
            items.filter(
                (i) => (filter === "all" || i.approvalStatus === filter) && (personaFilter === "all" || i.personaId === personaFilter)
            ),
        [items, filter, personaFilter]
    )
    const personaName = (id: string) => personas.find((p) => p.id === id)?.name
    const busyId =
        (update.isPending && update.variables?.contentId) ||
        (setStatus.isPending && setStatus.variables?.contentId) ||
        (exportDraft.isPending && exportDraft.variables) ||
        ""

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Autopilot</h1>
                <p className="text-muted-foreground">
                    Sourced drafts from your personas. Review, edit, then send the good ones to your normal drafts – nothing is published automatically.
                </p>
            </div>
            <AutopilotNav />

            <div className="flex flex-wrap items-center gap-3">
                <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Needs review</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={personaFilter} onValueChange={setPersonaFilter}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All personas</SelectItem>
                        {personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">{visible.length} draft{visible.length === 1 ? "" : "s"}</span>
            </div>

            {isLoading ? (
                <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
            ) : visible.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 p-12 text-center">
                    <FileText className="h-9 w-9 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">{items.length === 0 ? "No drafts yet" : "Nothing here"}</h2>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {items.length === 0
                            ? "Open a persona's menu and choose “Run research”. It reads your feeds, writes sourced drafts and fact-checks them."
                            : "Try another filter."}
                    </p>
                    {items.length === 0 && <Button asChild><Link href={Routes.AUTOPILOT}>Go to personas</Link></Button>}
                </Card>
            ) : (
                <div className="space-y-4">
                    {visible.map((item) => (
                        // Re-mount when the saved text changes so the editor resets to it.
                        <DraftCard
                            key={`${item.id}-${item.version}`}
                            item={item}
                            personaName={personaName(item.personaId)}
                            busy={busyId === item.id}
                            onSave={(text) => update.mutate({ contentId: item.id, text })}
                            onReject={() => setStatus.mutate({ contentId: item.id, status: "rejected" })}
                            onRestore={() => setStatus.mutate({ contentId: item.id, status: "pending" })}
                            onExport={() => exportDraft.mutate(item.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
