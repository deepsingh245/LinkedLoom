"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Routes } from "@/lib/routes"

/** "Back to Autopilot" link. Autopilot is one screen; its secondary pages link back to it. */
export function AutopilotNav() {
    return (
        <nav aria-label="Autopilot">
            <Link href={Routes.AUTOPILOT} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#357d72] transition-colors hover:bg-[#f3f6f5] hover:text-[#286c63]">
                <ArrowLeft className="h-4 w-4" />Back to Autopilot
            </Link>
        </nav>
    )
}
