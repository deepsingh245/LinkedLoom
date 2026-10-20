"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/providers/auth-provider"
import { AutopilotSubpage } from "@/components/features/autopilot/AutopilotSubpage"
import { useCreditLedger, useCreditWallet, useUsageRecords } from "@/lib/query/hooks/use-ai-billing"
import { usePersonas } from "@/lib/query/hooks/use-autopilot"
import type { LedgerEntry } from "@/types/ai"

const FEATURE_LABELS: Record<string, string> = {
    "autopilot.testGenerate": "Persona test",
    "autopilot.research.search": "Research · web search",
    "autopilot.research.extract": "Research · read articles",
    "autopilot.research.generate": "Research · write drafts",
    "autopilot.research.verify": "Research · fact-check",
    "editor.generatePost": "Create Post · text",
    "editor.enhanceImagePrompt": "Create Post · prompt",
    "editor.generateImage": "Create Post · image",
}

function ledgerLabel(e: LedgerEntry): string {
    if (e.type === "grant") return e.meta?.reason === "trial" ? "Trial credits" : "Credits added"
    if (e.type === "consumption") return "AI usage"
    if (e.type === "reservation") return "Held for a request"
    if (e.type === "release") return "Hold released"
    return "Adjustment"
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
        <Card className="rounded-xl border border-[#e2e6ea] bg-white p-5 shadow-none">
            <p className="text-xs font-medium text-[#6c777f]">{label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
            {hint && <p className="mt-1 text-xs text-[#89939a]">{hint}</p>}
        </Card>
    )
}

export default function CreditsPage() {
    const { user } = useAuth()
    const { data: wallet, isLoading: walletLoading } = useCreditWallet(user?.uid)
    const { data: ledger = [] } = useCreditLedger(user?.uid)
    const { data: usage = [] } = useUsageRecords(user?.uid)
    const { data: personas = [] } = usePersonas(user?.uid)

    const month = useMemo(() => {
        const now = new Date()
        const thisMonth = usage.filter(
            (u) => u.createdAt && u.createdAt.getMonth() === now.getMonth() && u.createdAt.getFullYear() === now.getFullYear()
        )
        const byFeature = new Map<string, { calls: number; credits: number; tokens: number }>()
        for (const u of thisMonth) {
            const key = FEATURE_LABELS[u.feature] ?? u.feature
            const row = byFeature.get(key) ?? { calls: 0, credits: 0, tokens: 0 }
            row.calls++
            row.credits += u.credits
            row.tokens += u.usage.inputTokens + u.usage.outputTokens
            byFeature.set(key, row)
        }
        return {
            credits: thisMonth.reduce((s, u) => s + u.credits, 0),
            calls: thisMonth.length,
            byFeature: Array.from(byFeature.entries()),
        }
    }, [usage])

    const personaName = (id?: string) => personas.find((p) => p.id === id)?.name

    return (
        <AutopilotSubpage
            eyebrow="Autopilot / Credits & usage"
            title="Credits & usage"
            description="Credits pay for AI that runs on LinkedLoom's keys. Your own keys and Create Post don't use credits."
        >

            {walletLoading ? (
                <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    <Stat label="Available credits" value={wallet?.available ?? 0} hint={wallet?.reserved ? `${wallet.reserved} held for running requests` : undefined} />
                    <Stat label="Credits used this month" value={month.credits} />
                    <Stat label="AI requests this month" value={month.calls} hint="Includes Create Post (metered, free)" />
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="rounded-xl border border-[#e2e6ea] bg-white p-5 shadow-none">
                    <h2 className="mb-4 text-sm font-semibold text-[#283139]">Usage this month</h2>
                    {month.byFeature.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No AI usage yet this month.</p>
                    ) : (
                        <div className="space-y-2">
                            {month.byFeature.map(([feature, row]) => (
                                <div key={feature} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-foreground">{feature}</span>
                                    <span className="text-muted-foreground">
                                        {row.calls} req · {row.tokens.toLocaleString()} tokens · {row.credits} credits
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="rounded-xl border border-[#e2e6ea] bg-white p-5 shadow-none">
                    <h2 className="mb-4 text-sm font-semibold text-[#283139]">Credit history</h2>
                    {ledger.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No credit activity yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {ledger.filter((e) => e.type !== "reservation" && e.type !== "release").slice(0, 20).map((e) => (
                                <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-foreground">{ledgerLabel(e)}</p>
                                        <p className="text-xs text-muted-foreground">{e.createdAt?.toLocaleString()}</p>
                                    </div>
                                    <span className={e.amount < 0 ? "text-destructive" : "text-primary"}>
                                        {e.amount > 0 ? `+${e.amount}` : e.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Card className="rounded-xl border border-[#e2e6ea] bg-white p-5 shadow-none">
                <h2 className="mb-4 text-sm font-semibold text-[#283139]">Recent AI requests</h2>
                {usage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing yet.</p>
                ) : (
                    <div className="space-y-2">
                        {usage.slice(0, 25).map((u) => (
                            <div key={u.id} className="flex flex-col gap-1 border-b border-border pb-2 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-foreground">
                                        {FEATURE_LABELS[u.feature] ?? u.feature}
                                        {personaName(u.personaId) ? ` · ${personaName(u.personaId)}` : ""}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {u.model} · {u.billingMode === "byok" ? "your key" : "managed"} · {u.createdAt?.toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {u.status !== "ok" && <Badge variant="draft">{u.status}</Badge>}
                                    <span className="text-muted-foreground">
                                        {(u.usage.inputTokens + u.usage.outputTokens).toLocaleString()} tokens · {u.credits} cr
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </AutopilotSubpage>
    )
}
