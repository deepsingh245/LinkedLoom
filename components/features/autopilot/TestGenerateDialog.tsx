"use client"

import { useState } from "react"
import { Copy, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTestPersonaGeneration } from "@/lib/query/hooks/use-ai-billing"
import { successToast } from "@/lib/toast"
import type { Persona } from "@/types/autopilot"

interface TestGenerateDialogProps {
    persona: Persona
    userId?: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** Try a persona's voice once. Nothing is saved or published. */
export function TestGenerateDialog({ persona, userId, open, onOpenChange }: TestGenerateDialogProps) {
    const generate = useTestPersonaGeneration(userId)
    const [topic, setTopic] = useState("")
    const result = generate.data

    const close = (v: boolean) => {
        if (!v) generate.reset()
        onOpenChange(v)
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Test “{persona.name}”</DialogTitle>
                    <DialogDescription>
                        Generates one sample post with this persona&apos;s voice and billing ({persona.ai.connectionId ? "your own key" : "LinkedLoom credits"}). Nothing is saved or published.
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                        e.preventDefault()
                        generate.mutate({ personaId: persona.id, topic: topic.trim() || undefined })
                    }}
                >
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="test-topic">Topic <span className="text-muted-foreground/60">(optional)</span></Label>
                        <Input
                            id="test-topic"
                            maxLength={200}
                            placeholder={persona.research.topics[0]}
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={generate.isPending}>
                        <Sparkles className="mr-2 h-4 w-4" /> {generate.isPending ? "Generating..." : "Generate"}
                    </Button>
                </form>

                {result && (
                    <div className="space-y-3 rounded-xl border border-border bg-accent/30 p-4">
                        <p className="whitespace-pre-wrap text-sm text-foreground">{result.post}</p>
                        {result.hashtags.length > 0 && (
                            <p className="text-sm text-primary">{result.hashtags.map((h) => `#${h}`).join(" ")}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {result.model} · {result.usage.inputTokens + result.usage.outputTokens} tokens ·{" "}
                            {result.billingMode === "byok" ? "billed to your key" : `${result.credits} credits`}
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {result && (
                        <Button
                            variant="outline"
                            onClick={async () => {
                                const tags = result.hashtags.map((h) => `#${h}`).join(" ")
                                await navigator.clipboard.writeText(tags ? `${result.post}\n\n${tags}` : result.post)
                                successToast("Copied.")
                            }}
                        >
                            <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => close(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
