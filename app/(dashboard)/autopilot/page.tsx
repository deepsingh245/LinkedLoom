"use client"

import { useState } from "react"
import Link from "next/link"
import { Bot, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/providers/auth-provider"
import { Routes } from "@/lib/routes"
import { PERSONA_LIMITS } from "@/lib/schemas/persona"
import {
    useAutopilotSettings,
    useDeletePersona,
    usePersonas,
    useSetAutopilotEnabled,
    useSetPersonaStatus,
} from "@/lib/query/hooks/use-autopilot"
import { PersonaCard } from "@/components/features/autopilot/PersonaCard"
import { KillSwitch } from "@/components/features/autopilot/KillSwitch"
import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav"
import { TestGenerateDialog } from "@/components/features/autopilot/TestGenerateDialog"
import { RunResearchDialog } from "@/components/features/autopilot/RunResearchDialog"
import { countScheduledRunAlerts, useRuns } from "@/lib/query/hooks/use-research"
import type { Persona } from "@/types/autopilot"

export default function AutopilotPage() {
    const { user } = useAuth()
    const { data: personas = [], isLoading } = usePersonas(user?.uid)
    const { data: settings } = useAutopilotSettings(user?.uid)
    const { data: runs = [] } = useRuns(user?.uid)
    const runAlerts = countScheduledRunAlerts(runs)
    const setStatus = useSetPersonaStatus(user?.uid)
    const deletePersona = useDeletePersona(user?.uid)
    const setEnabled = useSetAutopilotEnabled(user?.uid)
    const [showArchived, setShowArchived] = useState(false)
    const [testing, setTesting] = useState<Persona | null>(null)
    const [researching, setResearching] = useState<Persona | null>(null)

    const live = personas.filter((p) => p.status !== "archived")
    const archived = personas.filter((p) => p.status === "archived")
    const atLimit = live.length >= PERSONA_LIMITS.personasPerWorkspace
    const busyId = (setStatus.isPending && setStatus.variables?.personaId) || (deletePersona.isPending && deletePersona.variables)

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-20 rounded-2xl" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Autopilot</h1>
                    <p className="text-muted-foreground">
                        Personas research topics and draft posts for your approval. {live.length}/{PERSONA_LIMITS.personasPerWorkspace} personas.
                    </p>
                </div>
                {atLimit ? (
                    <Button disabled title="Archive a persona to create a new one"><Plus className="mr-2 h-4 w-4" /> New persona</Button>
                ) : (
                    <Button asChild>
                        <Link href={Routes.AUTOPILOT_NEW}><Plus className="mr-2 h-4 w-4" /> New persona</Link>
                    </Button>
                )}
            </div>

            <AutopilotNav />

            {runAlerts > 0 && (
                <Card className="border-destructive/40 p-4 text-sm" role="status">
                    <span className="font-medium">{runAlerts} scheduled research run{runAlerts === 1 ? "" : "s"} failed or were skipped in the last 7 days.</span>{" "}
                    <Link href={Routes.AUTOPILOT_RUNS} className="underline underline-offset-2">Review runs</Link>
                </Card>
            )}

            <KillSwitch
                enabled={settings?.autopilotEnabled ?? true}
                pending={setEnabled.isPending}
                onChange={(enabled) => setEnabled.mutate(enabled)}
            />

            {live.length === 0 ? (
                <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                    <Bot className="h-10 w-10 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Create your first persona</h2>
                    <p className="max-w-md text-sm text-muted-foreground">
                        A persona is a voice with topics, an audience and a posting schedule – for example “AI &amp; Technology Expert”.
                    </p>
                    <Button asChild className="mt-2">
                        <Link href={Routes.AUTOPILOT_NEW}><Plus className="mr-2 h-4 w-4" /> New persona</Link>
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {live.map((persona) => (
                        <PersonaCard
                            key={persona.id}
                            persona={persona}
                            onTest={() => setTesting(persona)}
                            onResearch={() => setResearching(persona)}
                            busy={busyId === persona.id}
                            onStatusChange={(status) => setStatus.mutate({ personaId: persona.id, status })}
                            onDelete={() => deletePersona.mutate(persona.id)}
                        />
                    ))}
                </div>
            )}

            {archived.length > 0 && (
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
                        {showArchived ? "Hide" : "Show"} archived ({archived.length})
                    </Button>
                    {showArchived && (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {archived.map((persona) => (
                                <PersonaCard
                                    key={persona.id}
                                    persona={persona}
                                    busy={busyId === persona.id}
                                    onStatusChange={(status) => setStatus.mutate({ personaId: persona.id, status })}
                                    onDelete={() => deletePersona.mutate(persona.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {researching && (
                <RunResearchDialog
                    persona={researching}
                    userId={user?.uid}
                    open={!!researching}
                    onOpenChange={(open) => !open && setResearching(null)}
                />
            )}

            {testing && (
                <TestGenerateDialog
                    persona={testing}
                    userId={user?.uid}
                    open={!!testing}
                    onOpenChange={(open) => !open && setTesting(null)}
                />
            )}
        </div>
    )
}
