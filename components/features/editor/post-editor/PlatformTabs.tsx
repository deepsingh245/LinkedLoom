import * as React from "react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PlatformTabsProps {
    connectedPlatforms: string[]
    activePlatform: string
    setActivePlatform: (val: string) => void
}

export function PlatformTabs({
    connectedPlatforms,
    activePlatform,
    setActivePlatform,
}: PlatformTabsProps) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <TabsList className="h-9 w-fit gap-1 rounded-lg border border-[#e2e6ea] bg-white p-1 shadow-none">
                {connectedPlatforms.includes("linkedin") && (
                    <TabsTrigger 
                        value="linkedin" 
                        className="h-full rounded-md px-4 text-[11px] font-semibold text-[#7b858c] transition data-[state=active]:bg-[#e8f3f0] data-[state=active]:text-[#286c63]"
                    >
                        LinkedIn
                    </TabsTrigger>
                )}
                {connectedPlatforms.includes("x") && (
                    <TabsTrigger 
                        value="x" 
                        className="h-full rounded-md px-4 text-[11px] font-semibold text-[#7b858c] transition data-[state=active]:bg-[#e8f3f0] data-[state=active]:text-[#286c63]"
                    >
                        X
                    </TabsTrigger>
                )}
                {connectedPlatforms.includes("reddit") && (
                    <TabsTrigger 
                        value="reddit" 
                        className="h-full rounded-md px-4 text-[11px] font-semibold text-[#7b858c] transition data-[state=active]:bg-[#e8f3f0] data-[state=active]:text-[#286c63]"
                    >
                        Reddit
                    </TabsTrigger>
                )}
            </TabsList>
        </div>
    )
}
