"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { usePosts } from "@/lib/query/hooks/use-posts"
import { usePublisherHeartbeat } from "@/lib/query/hooks/use-publishing"
import { isOverdue, normalizeStatus } from "@/lib/posts/status"
import { Routes } from "@/lib/routes"

const STALE_AFTER_MS = 30 * 60_000

const ago = (ms: number) => {
    const minutes = Math.max(1, Math.round(ms / 60_000))
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
    const hours = Math.round(minutes / 60)
    return hours < 48 ? `${hours} hour${hours === 1 ? "" : "s"} ago` : `${Math.round(hours / 24)} days ago`
}

/**
 * Shown only when something needs the user: scheduled posts that are overdue (with a hint whether the scheduler
 * seems to be down) or posts held back as MISSED. Nothing is shown when everything is on time.
 */
export function PublishingHealthBanner({ userId }: { userId?: string }) {
    const { data: posts = [] } = usePosts(userId)
    const { data: heartbeat } = usePublisherHeartbeat()
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000)
        return () => clearInterval(timer)
    }, [])

    const overdue = posts.filter((post) => isOverdue(post, now)).length
    const missed = posts.filter((post) => normalizeStatus(post.status) === "MISSED").length
    if (!overdue && !missed) return null

    const lastRun = heartbeat?.lastRunAt.getTime()
    const stale = !lastRun || now - lastRun > STALE_AFTER_MS
    const plural = (n: number) => (n === 1 ? "post is" : "posts are")

    return (
        <Card role="status" className="space-y-1.5 rounded-xl border border-[#f0dcc0] bg-[#fffaf1] p-4 text-sm shadow-none">
            <p className="flex items-center gap-2 font-semibold text-[#7a5a1f]"><AlertTriangle className="h-4 w-4 shrink-0" />Publishing needs your attention</p>
            {overdue > 0 && (
                <p className="text-xs leading-relaxed text-[#6b5a3a]">
                    {overdue} scheduled {plural(overdue)} past {overdue === 1 ? "its" : "their"} time.{" "}
                    {stale
                        ? `The publishing scheduler ${lastRun ? `last ran ${ago(now - lastRun)}` : "hasn't reported yet"}, so ${overdue === 1 ? "it" : "they"} will go out when it runs again. Posts more than 3 hours late are held back for your decision instead.`
                        : "They will be picked up on the next run (every 10 minutes)."}
                </p>
            )}
            {missed > 0 && (
                <p className="text-xs leading-relaxed text-[#6b5a3a]">
                    {missed} {plural(missed)} too late to publish automatically and {missed === 1 ? "was" : "were"} held back. Open {missed === 1 ? "it" : "each"} and choose <strong>Publish now</strong> or <strong>Reschedule</strong>.{" "}
                    <Link href={`${Routes.SCHEDULE}?tab=attention`} className="font-semibold text-[#7a5a1f] underline underline-offset-2">Review</Link>
                </p>
            )}
        </Card>
    )
}
