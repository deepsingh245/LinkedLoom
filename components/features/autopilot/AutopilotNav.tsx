"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, Coins, FileText, History, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { Routes } from "@/lib/routes"
import { useAuth } from "@/components/providers/auth-provider"
import { countScheduledRunAlerts, useRuns } from "@/lib/query/hooks/use-research"

const items = [
    { href: Routes.AUTOPILOT, label: "Personas", icon: Bot },
    { href: Routes.AUTOPILOT_DRAFTS, label: "Drafts", icon: FileText },
    { href: Routes.AUTOPILOT_RUNS, label: "Runs", icon: History },
    { href: Routes.AUTOPILOT_AI, label: "AI keys", icon: KeyRound },
    { href: Routes.AUTOPILOT_CREDITS, label: "Credits & usage", icon: Coins },
]

export function AutopilotNav() {
    const pathname = usePathname()
    const { user } = useAuth()
    const { data: runs = [] } = useRuns(user?.uid)
    const alerts = countScheduledRunAlerts(runs)
    return (
        <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
            {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                            active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                    >
                        <Icon className={cn("h-4 w-4", active && "text-primary")} />
                        {label}
                        {href === Routes.AUTOPILOT_RUNS && alerts > 0 && (
                            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground" aria-label={`${alerts} scheduled runs need attention`}>
                                {alerts}
                            </span>
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}
