"use client"

import Link from "next/link"
import { CheckCircle2, FileText, Inbox, Loader2, Search, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRunPersonaDemo } from "@/lib/query/hooks/use-research"
import { Routes } from "@/lib/routes"

export interface DemoPersona {
    id: string
    name: string
    ai?: { connectionId?: string }
}

interface PersonaDemoDialogProps {
    persona: DemoPersona
    userId?: string
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Shown right after creating the persona: friendlier heading + "Skip for now". */
    justCreated?: boolean
}

const HOW_IT_WORKS = [
    { icon: Search, title: "Research", text: "Before each posting window the persona reads your feeds (and web search, if on)." },
    { icon: ShieldCheck, title: "Write & fact-check", text: "It drafts posts in its voice, citing sources, and drops any claim it can't back up." },
    { icon: Inbox, title: "Your approval", text: "Drafts wait in Drafts. You edit, reject, or approve them to schedule on LinkedIn. Nothing is published unless you approve it (or turn on auto-publish)." },
]

/**
 * "Try a demo": shows how drafts will reach the user for approval by writing sample drafts right away
 * (one AI call) and putting them in the approval queue, labelled as demo drafts.
 */
export function PersonaDemoDialog({ persona, userId, open, onOpenChange, justCreated }: PersonaDemoDialogProps) {
    const demo = useRunPersonaDemo(userId)
    const result = demo.data

    const close = (value: boolean) => {
        if (demo.isPending) return // keep the dialog while the demo is being written
        if (!value) demo.reset()
        onOpenChange(value)
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {justCreated ? <CheckCircle2 className="h-5 w-5 text-[#357d72]" /> : <Sparkles className="h-5 w-5 text-[#357d72]" />}
                        {justCreated ? `“${persona.name}” is ready. Try a demo?` : `Try a demo of “${persona.name}”`}
                    </DialogTitle>
                    <DialogDescription>
                        See exactly how drafts will arrive for your approval. The demo writes 2 sample posts in this persona&apos;s voice right now and puts them in your
                        approval queue, marked <strong>Demo</strong>. It uses one AI call ({persona.ai?.connectionId ? "billed to your own key" : "a few LinkedLoom credits"}).
                    </DialogDescription>
                </DialogHeader>

                {!result && (
                    <ol className="grid gap-3 sm:grid-cols-3">
                        {HOW_IT_WORKS.map(({ icon: Icon, title, text }, i) => (
                            <li key={title} className="rounded-xl border border-[#e2e6ea] bg-[#fafbfb] p-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#283139]">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#e8f3f0] text-[#357d72]"><Icon className="h-3.5 w-3.5" /></span>
                                    {i + 1}. {title}
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-[#6c777f]">{text}</p>
                            </li>
                        ))}
                    </ol>
                )}

                {demo.isPending && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#e2e6ea] bg-white p-4 text-sm text-[#59656d]" role="status">
                        <Loader2 className="h-4 w-4 animate-spin text-[#357d72]" /> Writing 2 sample drafts in {persona.name}&apos;s voice…
                    </div>
                )}

                {result && (
                    <div className="space-y-3">
                        <p className="flex items-center gap-2 text-sm font-medium text-[#283139]">
                            <Inbox className="h-4 w-4 text-[#357d72]" /> {result.drafts.length} drafts are waiting for your approval
                        </p>
                        {result.drafts.map((draft, i) => (
                            <div key={i} className="space-y-2 rounded-xl border border-[#e2e6ea] bg-white p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="scheduled" className="text-[9px]">Needs review</Badge>
                                    <Badge variant="draft" className="text-[9px]">Demo · not researched</Badge>
                                    <span className="text-[11px] font-semibold text-[#38434a]">{draft.angle}</span>
                                </div>
                                <p className="line-clamp-6 whitespace-pre-wrap text-[13px] leading-relaxed text-[#303a40]">{draft.post}</p>
                                {draft.hashtags.length > 0 && <p className="text-[11px] text-[#357d72]">{draft.hashtags.map((h) => `#${h}`).join(" ")}</p>}
                            </div>
                        ))}
                        <p className="text-[11px] leading-relaxed text-[#7c878e]">
                            Real drafts look the same, plus their sources, quoted evidence and a fact-check score. Open the approval queue to try editing, rejecting or
                            sending a draft to your post drafts.
                            {result.billingMode === "managed" ? ` This demo used ${result.credits} credit${result.credits === 1 ? "" : "s"}.` : " This demo was billed to your own key."}
                        </p>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    {result ? (
                        <>
                            <Button variant="outline" onClick={() => close(false)}>Done</Button>
                            <Button asChild className="bg-[#357d72] text-white hover:bg-[#286c63]">
                                <Link href={Routes.AUTOPILOT_DRAFTS} onClick={() => close(false)}><FileText className="mr-2 h-4 w-4" />Open approval queue</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => close(false)} disabled={demo.isPending}>{justCreated ? "Skip for now" : "Cancel"}</Button>
                            <Button onClick={() => demo.mutate(persona.id)} disabled={demo.isPending} className="bg-[#357d72] text-white hover:bg-[#286c63]">
                                {demo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {demo.isPending ? "Running demo…" : "Run demo"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
