"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Routes } from "@/lib/routes"
import { useCreatePersona } from "@/lib/query/hooks/use-autopilot"
import { PersonaForm, emptyPersona } from "@/components/features/autopilot/PersonaForm"

export default function NewPersonaPage() {
    const router = useRouter()
    const { user } = useAuth()
    const createPersona = useCreatePersona(user?.uid)

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">New persona</h1>
                <p className="text-muted-foreground">Define the voice, topics and schedule. You approve every draft.</p>
            </div>
            <PersonaForm
                defaultValues={emptyPersona()}
                submitLabel="Create persona"
                onCancel={() => router.push(Routes.AUTOPILOT)}
                onSubmit={async (input) => {
                    await createPersona.mutateAsync(input)
                    router.push(Routes.AUTOPILOT)
                }}
            />
        </div>
    )
}
