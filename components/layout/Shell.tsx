"use client"
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Sidebar } from "./Sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-[#0c0c12] text-[#e0e0f0] font-sans font-normal antialiased">
            <Sidebar className="hidden md:flex" />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-[72px] border-b border-[#1e1e2a] flex items-center justify-between px-8 bg-[#0c0c12]/80 backdrop-blur-md sticky top-0 z-10 transition-all">
                    <h1 className="text-xl font-display font-semibold tracking-tight text-[#f0f0f8]"></h1>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
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
