"use client"
import { SettingsSidebar } from "./SettingsSidebar"
import { UserNav } from "@/components/layout/UserNav"

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-[#0c0c12] text-[#e0e0f0] font-sans font-normal antialiased">
            <SettingsSidebar className="hidden md:flex" />
            <div className="flex-1 flex flex-col h-full overflow-y-auto p-8 bg-[#0c0c12]">
                <div className="max-w-4xl mx-auto w-full">
                    {children}
                </div>
            </div>
        </div>
    );
}
