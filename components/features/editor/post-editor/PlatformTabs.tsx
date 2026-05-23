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
        <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-muted border border-border p-1 h-10.5 rounded-full w-fit flex items-center gap-1 shadow-inner">
                {connectedPlatforms.includes("linkedin") && (
                    <TabsTrigger 
                        value="linkedin" 
                        className="h-full rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-semibold text-[13px] transition-all duration-300"
                    >
                        LinkedIn
                    </TabsTrigger>
                )}
                {connectedPlatforms.includes("x") && (
                    <TabsTrigger 
                        value="x" 
                        className="h-full rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-semibold text-[13px] transition-all duration-300"
                    >
                        X
                    </TabsTrigger>
                )}
                {connectedPlatforms.includes("reddit") && (
                    <TabsTrigger 
                        value="reddit" 
                        className="h-full rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-semibold text-[13px] transition-all duration-300"
                    >
                        Reddit
                    </TabsTrigger>
                )}
            </TabsList>
        </div>
    )
}
