"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Routes } from "@/lib/routes"
import { useCreatePersona } from "@/lib/query/hooks/use-autopilot"
import { useAIConnections } from "@/lib/query/hooks/use-ai-billing"
import { PersonaForm, emptyPersona } from "@/components/features/autopilot/PersonaForm"
import { PersonaDemoDialog, type DemoPersona } from "@/components/features/autopilot/PersonaDemoDialog"

export default function NewPersonaPage() {
    const router = useRouter()
    const { user } = useAuth()
    const { data: connections = [] } = useAIConnections(user?.uid)
    const createPersona = useCreatePersona(user?.uid)
    // Right after creating, offer the demo before leaving the page.
    const [created, setCreated] = useState<DemoPersona | null>(null)

    return (
        <div className="mx-auto w-full max-w-[1120px] space-y-6 pb-6 text-[#20242b]">
            <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">Persona Studio / New profile</p>
                <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">Create a persona</h1>
                <p className="mt-1 text-sm leading-6 text-[#748087]">Tell us who it is and what it talks about. The technical setup is already filled in, and you approve every draft.</p>
            </div>
            <PersonaForm
                defaultValues={emptyPersona()}
                connections={connections}
                submitLabel="Create persona"
                onCancel={() => router.push(Routes.AUTOPILOT)}
                onSubmit={async (input) => {
                    const { id } = await createPersona.mutateAsync(input)
                    setCreated({ id, name: input.name, ai: { connectionId: input.ai.connectionId } })
                }}
            />
            {created && (
                <PersonaDemoDialog
                    persona={created}
                    userId={user?.uid}
                    open
                    justCreated
                    onOpenChange={(open) => {
                        if (!open) router.push(Routes.AUTOPILOT)
                    }}
                />
            )}
        </div>
    )
}
