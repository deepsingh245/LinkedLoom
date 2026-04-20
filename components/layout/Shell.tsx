"use client"

import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { useData } from "@/components/data-provider";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { refreshData, syncing } = useData();

    return (
        <div className="flex h-screen overflow-hidden bg-[#0c0c12] text-[#e0e0f0] font-sans font-normal antialiased">
            <Sidebar className="hidden md:flex" />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-18 border-b border-[#1e1e2a] flex items-center justify-between px-8 bg-[#0c0c12]/80 backdrop-blur-md sticky top-0 z-10 transition-all">
                    <h1 className="text-xl font-display font-semibold tracking-tight text-[#f0f0f8]"></h1>
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={refreshData}
                            disabled={syncing}
                            className={cn(
                                "h-9 px-4 rounded-xl border-[#1e1e2a] bg-[#0c0c12] hover:bg-[#1e1e2a] transition-all text-[#8888a0] hover:text-[#63d496] flex items-center gap-2 font-semibold",
                                syncing && "border-[#63d496]/20 bg-[#63d496]/5 text-[#63d496]"
                            )}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                            <span>{syncing ? "Syncing..." : "Sync Data"}</span>
                        </Button>
                        <UserNav />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-2 bg-[#0c0c12]">
                    {children}
                </main>
            </div>
        </div>
    );
}
