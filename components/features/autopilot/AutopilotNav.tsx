"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Routes } from "@/lib/routes"

/**
 * Autopilot is one screen (personas, approval inbox, research runs). The secondary pages (AI keys,
 * credits, persona studio) just link back to it instead of showing a tab bar.
 */
export function AutopilotNav() {
    return (
        <nav aria-label="Autopilot" className="border-b border-[#e2e6ea] pb-3">
            <Link href={Routes.AUTOPILOT} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#357d72] transition-colors hover:bg-[#f3f6f5] hover:text-[#286c63]">
                <ArrowLeft className="h-4 w-4" />Back to Autopilot
            </Link>
        </nav>
    )
}
