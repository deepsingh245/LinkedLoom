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
        <div className="flex h-screen overflow-hidden">
            <Sidebar className="w-64 hidden md:block" />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <h1 className="text-lg font-medium">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <UserNav />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
