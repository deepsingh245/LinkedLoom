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
import { PersonaForm, personaToFormValues } from "@/components/features/autopilot/PersonaForm"

export default function EditPersonaPage({ params }: { params: Promise<{ personaId: string }> }) {
    const { personaId } = use(params)
    const router = useRouter()
    const { user } = useAuth()
    const { data: persona, isLoading } = usePersona(user?.uid, personaId)
    const updatePersona = useUpdatePersona(user?.uid)

    if (isLoading) {
        return (
            <div className="mx-auto max-w-4xl space-y-6">
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
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{persona.name}</h1>
                <p className="text-muted-foreground">Version {persona.version} · {persona.status === "paused" ? "Paused" : "Active"}</p>
            </div>
            <PersonaForm
                key={persona.version}
                defaultValues={personaToFormValues(persona)}
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
