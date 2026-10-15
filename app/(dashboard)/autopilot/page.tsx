"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, FileCheck2, Plus, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav";
import { KillSwitch } from "@/components/features/autopilot/KillSwitch";
import { PersonaCard } from "@/components/features/autopilot/PersonaCard";
import { RunResearchDialog } from "@/components/features/autopilot/RunResearchDialog";
import { TestGenerateDialog } from "@/components/features/autopilot/TestGenerateDialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useAutopilotSettings, useDeletePersona, usePersonas, useSetAutopilotEnabled, useSetPersonaStatus } from "@/lib/query/hooks/use-autopilot";
import { countScheduledRunAlerts, useContentItems, useRuns } from "@/lib/query/hooks/use-research";
import { Routes } from "@/lib/routes";
import { PERSONA_LIMITS } from "@/lib/schemas/persona";
import type { Persona } from "@/types/autopilot";

export default function AutopilotPage() {
    const { user } = useAuth();
    const { data: personas = [], isLoading: personasLoading } = usePersonas(user?.uid);
    const { data: settings } = useAutopilotSettings(user?.uid);
    const { data: runs = [] } = useRuns(user?.uid);
    const { data: drafts = [], isLoading: draftsLoading } = useContentItems(user?.uid);
    const setStatus = useSetPersonaStatus(user?.uid);
    const deletePersona = useDeletePersona(user?.uid);
    const setEnabled = useSetAutopilotEnabled(user?.uid);
    const [showArchived, setShowArchived] = useState(false);
    const [testing, setTesting] = useState<Persona | null>(null);
    const [researching, setResearching] = useState<Persona | null>(null);

    const live = personas.filter((persona) => persona.status !== "archived");
    const active = live.filter((persona) => persona.status === "active").length;
    const archived = personas.filter((persona) => persona.status === "archived");
    const pendingDrafts = drafts.filter((draft) => draft.approvalStatus === "pending").length;
    const runAlerts = countScheduledRunAlerts(runs);
    const atLimit = live.length >= PERSONA_LIMITS.personasPerWorkspace;
    const busyId = (setStatus.isPending && setStatus.variables?.personaId) || (deletePersona.isPending && deletePersona.variables);
    const enabled = settings?.autopilotEnabled ?? true;

    if (personasLoading) {
        return (
            <div className="mx-auto w-full max-w-[1440px] space-y-6">
                <Skeleton className="h-16 w-2/3 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
            </div>
        );
    }

    const metrics = [
        { label: "Personas", value: `${live.length}/${PERSONA_LIMITS.personasPerWorkspace}`, note: `${active} active`, icon: Bot, tint: "#e8f3f0", color: "#357d72" },
        { label: "Research runs", value: String(runs.length), note: `${runs.filter((run) => run.status === "running" || run.status === "queued").length} in progress`, icon: Radio, tint: "#edf2fa", color: "#5578a8" },
        { label: "Drafts to review", value: String(pendingDrafts), note: draftsLoading ? "Loading draft queue…" : "Manual approval required", icon: FileCheck2, tint: "#f7f2e9", color: "#a67b37" },
        { label: "Needs attention", value: String(runAlerts), note: "Scheduled run alerts · 7 days", icon: AlertTriangle, tint: runAlerts ? "#faeeee" : "#f2f4f4", color: runAlerts ? "#b95656" : "#77818a" },
    ];

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-5 text-[#20242b] md:space-y-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4c9a70]" />Operations / Autopilot Engine
                    </div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">Autopilot Control Room</h1>
                    <p className="mt-1 text-sm text-[#748087]">Manage research personas, monitor runs, and review every draft before it goes anywhere.</p>
                </div>
                {atLimit ? (
                    <Button disabled title="Archive a persona to create a new one" className="h-9 rounded-lg"> <Plus className="mr-2 h-4 w-4" />New persona</Button>
                ) : (
                    <Button asChild className="h-9 rounded-lg bg-[#357d72] px-3 text-xs font-semibold text-white hover:bg-[#286c63]">
                        <Link href={Routes.AUTOPILOT_NEW}><Plus className="mr-2 h-4 w-4" />New persona</Link>
                    </Button>
                )}
            </section>

            <AutopilotNav />

            {runAlerts > 0 && (
                <Card className="flex items-start gap-3 rounded-xl border border-[#f0d8d8] bg-[#fff9f9] p-4 text-sm shadow-none" role="status">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b95656]" />
                    <div className="flex-1 text-[#634646]">
                        <span className="font-semibold">{runAlerts} scheduled run{runAlerts === 1 ? "" : "s"} need attention.</span> These runs failed or were skipped in the last 7 days.
                    </div>
                    <Link href={Routes.AUTOPILOT_RUNS} className="shrink-0 text-xs font-semibold text-[#9d4b4b] underline underline-offset-2">Review</Link>
                </Card>
            )}

            <KillSwitch enabled={enabled} pending={setEnabled.isPending} onChange={(value) => setEnabled.mutate(value)} />

            <section aria-label="Autopilot metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(({ label, value, note, icon: Icon, tint, color }) => (
                    <Card key={label} className="rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-[#6c777f]">{label}</p>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: tint, color }}><Icon className="h-4 w-4" /></span>
                        </div>
                        <p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.04em] text-[#20242b]">{value}</p>
                        <p className="mt-2 truncate text-[11px] text-[#89939a]">{note}</p>
                    </Card>
                ))}
            </section>

            <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-[#283139]">Research personas</h2>
                        <p className="mt-1 text-[11px] text-[#89939a]">Each persona researches its topics and prepares drafts for your approval.</p>
                    </div>
                    {live.length > 0 && <span className="text-[11px] text-[#89939a]">{active} active · {live.length - active} paused</span>}
                </div>

                {live.length === 0 ? (
                    <Card className="flex min-h-[245px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#dfe5e7] bg-white p-8 text-center shadow-none">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3f0] text-[#357d72]"><Sparkles className="h-5 w-5" /></span>
                        <div>
                            <h3 className="text-sm font-semibold text-[#38434a]">Create your first research persona</h3>
                            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#7c878e]">Give it a voice, topics, an audience and a schedule. Autopilot prepares sourced drafts, and you approve each one manually.</p>
                        </div>
                        <Button asChild className="mt-1 h-9 rounded-lg bg-[#357d72] px-3 text-xs text-white hover:bg-[#286c63]">
                            <Link href={Routes.AUTOPILOT_NEW}><Plus className="mr-2 h-4 w-4" />Create persona</Link>
                        </Button>
                    </Card>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
            </section>

            {archived.length > 0 && (
                <section className="space-y-3 border-t border-[#e7ebed] pt-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowArchived((value) => !value)} className="h-8 px-2 text-xs text-[#68747c] hover:bg-[#f0f4f3]">
                        {showArchived ? "Hide" : "Show"} archived personas ({archived.length})
                    </Button>
                    {showArchived && <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{archived.map((persona) => (
                        <PersonaCard key={persona.id} persona={persona} busy={busyId === persona.id} onStatusChange={(status) => setStatus.mutate({ personaId: persona.id, status })} onDelete={() => deletePersona.mutate(persona.id)} />
                    ))}</div>}
                </section>
            )}

            {researching && <RunResearchDialog persona={researching} userId={user?.uid} open={!!researching} onOpenChange={(open) => !open && setResearching(null)} />}
            {testing && <TestGenerateDialog persona={testing} userId={user?.uid} open={!!testing} onOpenChange={(open) => !open && setTesting(null)} />}
        </div>
    );
}
