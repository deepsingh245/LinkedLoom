"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarClock, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useApprovalPreview } from "@/lib/query/hooks/use-research"
import { Routes } from "@/lib/routes"
import type { ContentItem } from "@/types/research"

interface ApproveDialogProps {
    item: ContentItem | null
    personaName?: string
    open: boolean
    busy?: boolean
    onOpenChange: (open: boolean) => void
    /** `scheduledFor` (ISO) only when the user picked a time; otherwise the next free slot is used. */
    onConfirm: (scheduledFor?: string) => void
}

/** `YYYY-MM-DDTHH:mm` in the browser's time zone, for <input type="datetime-local">. */
const toLocalInput = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatIn = (iso: string, timeZone?: string) =>
    new Date(iso).toLocaleString(undefined, { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/**
 * Mount it with `key={item.id}` so the picked time resets per draft.
 * "Approve & schedule": suggests the persona's next free posting slot, lets the user pick another time,
 * and explains what happens next. The post goes out on LinkedIn at that time unless it's unscheduled.
 */
export function ApproveDialog({ item, personaName, open, busy, onOpenChange, onConfirm }: ApproveDialogProps) {
    const { data: preview, isLoading, error } = useApprovalPreview(item?.id, open)
    const [custom, setCustom] = useState<string | null>(null)
    const rescheduling = item?.approvalStatus === "approved"

    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const customDate = custom ? new Date(custom) : null
    const customIso = customDate && !Number.isNaN(customDate.getTime()) ? customDate.toISOString() : null
    const customTooSoon = !!customIso && new Date(customIso).getTime() < Date.now() + 3 * 60_000
    const canConfirm = !!preview && !preview.blocker && (custom ? !!customIso && !customTooSoon : !!preview.suggestedAt)

    return (
        <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#357d72]" />{rescheduling ? "Reschedule post" : "Approve & schedule"}</DialogTitle>
                    <DialogDescription>
                        {personaName ? `${personaName} · ` : ""}It will be published on your LinkedIn profile at this time. You can edit, reschedule or unschedule it until then.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-[#6e7b81]"><Loader2 className="h-4 w-4 animate-spin" />Finding the next free slot…</div>
                ) : error || !preview ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">Couldn&apos;t load the schedule. Close this and try again.</p>
                ) : preview.blocker ? (
                    <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
                        <p>{preview.blocker}</p>
                        {(!preview.linkedinConnected || preview.linkedinExpired) && (
                            <Button asChild size="sm" className="h-8 rounded-lg bg-[#357d72] text-[11px] text-white hover:bg-[#286c63]">
                                <Link href={Routes.SETTINGS_CONNECTIONS}>{preview.linkedinExpired ? "Reconnect LinkedIn" : "Connect LinkedIn"}</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {!custom ? (
                            <div className="rounded-xl border border-[#dce9e5] bg-[#f6fbf9] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#62766f]">Next free posting slot</p>
                                {preview.suggestedAt ? (
                                    <>
                                        <p className="mt-1 text-base font-semibold text-[#20242b]">{formatIn(preview.suggestedAt, preview.timezone)}</p>
                                        <p className="mt-0.5 text-[11px] text-[#6e7b81]">
                                            {preview.timezone}{preview.window ? ` · posting window ${preview.window.start}–${preview.window.end}` : ""}
                                            {browserZone !== preview.timezone ? ` · ${formatIn(preview.suggestedAt)} your time` : ""}
                                        </p>
                                    </>
                                ) : (
                                    <p className="mt-1 text-sm text-[#6e7b81]">No free slot in the next 14 days. Pick a time instead.</p>
                                )}
                                <button type="button" className="mt-3 text-xs font-semibold text-[#357d72] hover:underline" onClick={() => setCustom(toLocalInput(preview.suggestedAt ?? new Date(Date.now() + 3_600_000).toISOString()))}>
                                    Pick another time
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label htmlFor="approve-time" className="text-xs font-medium text-[#46515a]">Publish at (your time, {browserZone})</label>
                                <Input id="approve-time" type="datetime-local" value={custom} min={toLocalInput(new Date(Date.now() + 5 * 60_000).toISOString())} onChange={(event) => setCustom(event.target.value)} className="h-10 rounded-lg" />
                                {customIso && <p className="text-[11px] text-[#6e7b81]">{formatIn(customIso, preview.timezone)} in {preview.timezone}</p>}
                                {customTooSoon && <p className="text-[11px] text-red-600">Pick a time at least a few minutes from now.</p>}
                                <button type="button" className="text-xs font-semibold text-[#357d72] hover:underline" onClick={() => setCustom(null)}>Use the next free slot</button>
                            </div>
                        )}
                        <p className="text-[11px] leading-relaxed text-[#7c878e]">Only LinkedIn. If LinkedIn doesn&apos;t answer clearly we won&apos;t retry on our own – we&apos;ll ask you to check, so nothing is posted twice.</p>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
                    <Button disabled={!canConfirm || busy} onClick={() => onConfirm(custom && customIso ? customIso : undefined)} className="rounded-lg bg-[#357d72] text-white hover:bg-[#286c63]">
                        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                        {rescheduling ? "Reschedule" : "Approve & schedule"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
