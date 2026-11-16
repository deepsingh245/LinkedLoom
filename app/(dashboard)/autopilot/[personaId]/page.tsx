"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/providers/auth-provider"
import { Routes } from "@/lib/routes"
import { usePersona, useUpdatePersona } from "@/lib/query/hooks/use-autopilot"
import { useAIConnections } from "@/lib/query/hooks/use-ai-billing"
import { PersonaForm, personaToFormValues } from "@/components/features/autopilot/PersonaForm"

export default function EditPersonaPage({ params }: { params: Promise<{ personaId: string }> }) {
    const { personaId } = use(params)
    const router = useRouter()
    const { user } = useAuth()
    const { data: connections = [] } = useAIConnections(user?.uid)
    const { data: persona, isLoading } = usePersona(user?.uid, personaId)
    const updatePersona = useUpdatePersona(user?.uid)

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-[1120px] space-y-6 pb-6 text-[#20242b]">
                <Skeleton className="h-10 w-64" />
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
        )
    }

    if (!persona || persona.status === "archived") {
        return (
            <Card className="mx-auto max-w-xl p-10 text-center space-y-4">
                <h1 className="text-xl font-semibold text-foreground">
                    {persona ? "This persona is archived" : "Persona not found"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {persona ? "Restore it from the Autopilot page to edit it." : "It may have been deleted."}
                </p>
                <Button asChild variant="outline"><Link href={Routes.AUTOPILOT}>Back to Autopilot</Link></Button>
            </Card>
        )
    }

    return (
        <div className="mx-auto w-full max-w-[1120px] space-y-6 pb-6 text-[#20242b]">
            <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">Persona Studio / Edit profile</p>
                <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">{persona.name}</h1>
                <p className="mt-1 text-sm text-[#748087]">Version {persona.version} · {persona.status === "paused" ? "Paused" : "Active"}</p>
            </div>
            <PersonaForm
                key={persona.version}
                defaultValues={personaToFormValues(persona)}
                connections={connections}
                submitLabel="Save changes"
                onCancel={() => router.push(Routes.AUTOPILOT)}
                onSubmit={async (input) => {
                    await updatePersona.mutateAsync({ personaId, expectedVersion: persona.version, persona: input })
                    router.push(Routes.AUTOPILOT)
                }}
            />
        </div>
    )
}
