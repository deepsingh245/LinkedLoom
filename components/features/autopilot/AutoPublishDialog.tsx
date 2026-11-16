"use client"

import { useState } from "react"
import { Loader2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AutoPublishDialogProps {
    personaName: string
    /** Current mode; the dialog offers the opposite. */
    mode: "manual" | "automatic"
    open: boolean
    busy?: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (mode: "manual" | "automatic") => void
}

/**
 * Opt-in auto-publish for one persona. Turning it on needs an explicit tick: drafts that pass verification
 * with a high quality score are then scheduled on LinkedIn without review.
 */
export function AutoPublishDialog({ personaName, mode, open, busy, onOpenChange, onConfirm }: AutoPublishDialogProps) {
    const [ack, setAck] = useState(false)
    const turningOn = mode === "manual"

    return (
        <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-[#357d72]" />{turningOn ? `Auto-publish for “${personaName}”?` : `Turn off auto-publish for “${personaName}”?`}</DialogTitle>
                    <DialogDescription>
                        {turningOn
                            ? "Drafts from this persona's research that pass fact-checking with a high quality score will be scheduled in its next free posting slot and published on your LinkedIn profile without your review."
                            : "New drafts will wait for your approval again. Posts that are already scheduled stay scheduled – unschedule them in Drafts if you don't want them to go out."}
                    </DialogDescription>
                </DialogHeader>

                {turningOn && (
                    <div className="space-y-3 text-xs leading-relaxed text-[#5f6b72]">
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Only LinkedIn, only research drafts (never demos), only drafts that meet the quality bar. The rest still wait for review.</li>
                            <li>Scheduled posts show in Drafts and your calendar. You can edit or unschedule them until they go out.</li>
                            <li>The Autopilot switch stops everything; pausing the persona stops new auto-scheduling.</li>
                        </ul>
                        <label className="flex items-start gap-2 rounded-lg border border-[#e2e6ea] bg-[#fafbfb] p-3 text-[#38434a]">
                            <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#357d72]" />
                            I understand posts will be published on my LinkedIn account without my review, and I&apos;m responsible for what is posted.
                        </label>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
                    <Button disabled={busy || (turningOn && !ack)} onClick={() => onConfirm(turningOn ? "automatic" : "manual")} className="rounded-lg bg-[#357d72] text-white hover:bg-[#286c63]">
                        {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                        {turningOn ? "Turn on auto-publish" : "Back to manual approval"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
