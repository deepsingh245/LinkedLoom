"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox,
    ArrowRight,
    AudioLines,
    FileCheck2,
    MessageSquareText,
    Plus,
    Sparkles,
    UsersRound,
} from "lucide-react";
import { AutopilotSubpage } from "@/components/features/autopilot/AutopilotSubpage";
import { TestGenerateDialog } from "@/components/features/autopilot/TestGenerateDialog";
import { PersonaDemoDialog } from "@/components/features/autopilot/PersonaDemoDialog";
import { QueryError } from "@/components/features/autopilot/QueryError";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePersonas } from "@/lib/query/hooks/use-autopilot";
import { PERSONA_LIMITS } from "@/lib/schemas/persona";
import { Routes } from "@/lib/routes";
import type { Persona } from "@/types/autopilot";

export default function PersonaStudioPage() {
    const { user } = useAuth();
    const { data: personas = [], isLoading, error, refetch } = usePersonas(user?.uid);
    const [testing, setTesting] = useState<Persona | null>(null);
    const [demoing, setDemoing] = useState<Persona | null>(null);
    const visiblePersonas = personas.filter((persona) => persona.status !== "archived");
    const activeCount = visiblePersonas.filter((persona) => persona.status === "active").length;
    const canCreate = visiblePersonas.length < PERSONA_LIMITS.personasPerWorkspace;

    return (
        <AutopilotSubpage
            eyebrow={<><AudioLines className="h-3.5 w-3.5 text-[#357d72]" /> Autopilot / Persona Studio</>}
            title="Persona Studio"
            description="Shape each writing voice, then preview a sample before research turns it into a draft. Every draft still waits for your approval."
            actions={
                canCreate ? (
                    <Button asChild className="h-9 rounded-lg bg-[#357d72] px-3 text-xs font-semibold text-white hover:bg-[#286c63]">
                        <Link href={Routes.AUTOPILOT_NEW}><Plus className="mr-2 h-4 w-4" />New persona</Link>
                    </Button>
                ) : (
                    <Button disabled title={`Maximum ${PERSONA_LIMITS.personasPerWorkspace} personas`} className="h-9 rounded-lg px-3 text-xs">
                        <Plus className="mr-2 h-4 w-4" />Persona limit reached
                    </Button>
                )
            }
        >

            <section aria-label="Persona studio summary" className="grid gap-3 sm:grid-cols-3">
                <SummaryCard icon={<UsersRound className="h-4 w-4" />} label="Personas" value={isLoading ? "—" : `${visiblePersonas.length} / ${PERSONA_LIMITS.personasPerWorkspace}`} note={`${activeCount} active`} />
                <SummaryCard icon={<AudioLines className="h-4 w-4" />} label="Voice profiles" value={isLoading ? "—" : String(visiblePersonas.length)} note="Identity, audience, tone and guidance" />
                <SummaryCard icon={<FileCheck2 className="h-4 w-4" />} label="Approval policy" value="Manual by default" note="Auto-publish is opt-in per persona" />
            </section>

            <section aria-labelledby="voice-profiles-title" className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 id="voice-profiles-title" className="text-sm font-semibold text-[#283139]">Voice profiles</h2>
                        <p className="mt-1 text-[11px] text-[#89939a]">Use the preview to hear the persona in a sample post, or edit the details that shape its voice.</p>
                    </div>
                    {!isLoading && visiblePersonas.length > 0 && <span className="text-[11px] text-[#89939a]">{visiblePersonas.length} configured</span>}
                </div>

                {isLoading ? (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-[280px] rounded-2xl" />)}
                    </div>
                ) : error ? (
                    <QueryError what="your personas" error={error} onRetry={() => refetch()} />
                ) : visiblePersonas.length === 0 ? (
                    <Card className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#dfe5e7] bg-white p-8 text-center shadow-none">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f3f0] text-[#357d72]"><Sparkles className="h-5 w-5" /></span>
                        <div>
                            <h3 className="text-sm font-semibold text-[#38434a]">Start with a writing voice</h3>
                            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#7c878e]">Set an identity, audience, tone and topics. You can preview a sample before using the persona for research.</p>
                        </div>
                        <Button asChild className="mt-1 h-9 rounded-lg bg-[#357d72] px-3 text-xs text-white hover:bg-[#286c63]">
                            <Link href={Routes.AUTOPILOT_NEW}><Plus className="mr-2 h-4 w-4" />Create a persona</Link>
                        </Button>
                    </Card>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {visiblePersonas.map((persona) => (
                            <VoiceProfileCard key={persona.id} persona={persona} onPreview={() => setTesting(persona)} onDemo={() => setDemoing(persona)} />
                        ))}
                    </div>
                )}
            </section>

            <div className="flex items-start gap-2.5 rounded-xl border border-[#e5e9eb] bg-white/70 px-4 py-3.5 text-xs leading-5 text-[#77838a]">
                <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-[#7c898f]" />
                <p>Voice previews generate a sample only. They do not save, schedule, or publish a post. Generation uses the persona’s selected AI connection or LinkedLoom credits.</p>
            </div>

            {demoing && <PersonaDemoDialog persona={demoing} userId={user?.uid} open={!!demoing} onOpenChange={(open) => !open && setDemoing(null)} />}
            {testing && <TestGenerateDialog persona={testing} userId={user?.uid} open={!!testing} onOpenChange={(open) => !open && setTesting(null)} />}
        </AutopilotSubpage>
    );
}

function SummaryCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
    return (
        <Card className="rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none">
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[#6c777f]">{label}</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f3f0] text-[#357d72]">{icon}</span>
            </div>
            <p className="mt-2 text-[22px] font-semibold leading-none tracking-[-0.04em] text-[#20242b]">{value}</p>
            <p className="mt-2 truncate text-[11px] text-[#89939a]">{note}</p>
        </Card>
    );
}

function VoiceProfileCard({ persona, onPreview, onDemo }: { persona: Persona; onPreview: () => void; onDemo: () => void }) {
    const tone = persona.identity.tone.charAt(0).toUpperCase() + persona.identity.tone.slice(1);
    const instructions = persona.identity.customInstructions?.trim();

    return (
        <Card className="flex min-h-[282px] flex-col gap-4 rounded-2xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f3f0] text-sm font-semibold text-[#357d72]">
                        {persona.name.trim().slice(0, 1).toUpperCase() || "P"}
                    </span>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#283139]">{persona.name}</h3>
                        <p className="mt-0.5 truncate text-[11px] text-[#7a858c]">{persona.identity.role}</p>
                    </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${persona.status === "active" ? "bg-[#e8f3f0] text-[#357d72]" : "bg-[#f2f4f5] text-[#78848b]"}`}>
                    {persona.status === "active" ? "Active" : "Paused"}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f7f9f8] p-3">
                <VoiceAttribute label="Tone" value={tone} />
                <VoiceAttribute label="Language" value={persona.identity.language} />
                <VoiceAttribute label="Audience" value={persona.identity.targetAudience} wide />
            </div>

            <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#879198]">Voice guidance</p>
                {instructions ? (
                    <p className="line-clamp-3 border-l-2 border-[#a8c9be] pl-3 text-xs leading-5 text-[#59666d]">{instructions}</p>
                ) : (
                    <p className="text-xs text-[#8b959b]">No custom voice guidance yet.</p>
                )}
            </div>

            <div className="mt-auto flex flex-wrap gap-1.5">
                {persona.research.topics.slice(0, 4).map((topic) => (
                    <span key={topic} className="max-w-full truncate rounded-md border border-[#e7ecea] bg-[#f5f8f7] px-2 py-1 text-[10px] text-[#65736f]">{topic}</span>
                ))}
                {persona.research.topics.length > 4 && <span className="px-1 py-1 text-[10px] text-[#78848b]">+{persona.research.topics.length - 4}</span>}
            </div>

            <div className="flex gap-2 border-t border-[#edf0f2] pt-3">
                <Button onClick={onPreview} variant="outline" className="h-9 flex-1 rounded-lg border-[#dfe5e7] bg-white px-2 text-[11px] text-[#46525a] hover:bg-[#f7f9f9]">
                    <Sparkles className="h-3.5 w-3.5" /> Preview voice
                </Button>
                <Button onClick={onDemo} variant="outline" className="h-9 flex-1 rounded-lg border-[#dfe5e7] bg-white px-2 text-[11px] text-[#46525a] hover:bg-[#f7f9f9]">
                    <Inbox className="h-3.5 w-3.5" /> Try a demo
                </Button>
                <Button asChild variant="outline" className="h-9 flex-1 rounded-lg border-[#dfe5e7] bg-white px-2 text-[11px] text-[#46525a] hover:bg-[#f7f9f9]">
                    <Link href={`${Routes.AUTOPILOT}/${persona.id}`}>Edit profile <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
            </div>
        </Card>
    );
}

function VoiceAttribute({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
    return (
        <div className={wide ? "col-span-2 min-w-0" : "min-w-0"}>
            <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#89949a]">{label}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-[#46525a]" title={value}>{value}</p>
        </div>
    );
}
