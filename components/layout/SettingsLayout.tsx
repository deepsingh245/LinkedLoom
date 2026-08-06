"use client"

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SettingsSidebar } from "./SettingsSidebar";
import { UserNav } from "@/components/layout/UserNav";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans font-normal antialiased">
            <SettingsSidebar className="hidden md:flex" />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-18 border-b border-border flex items-center justify-between px-6 md:px-8 bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-all md:hidden shrink-0">
                    <div className="flex items-center gap-3">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl"
                                >
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Toggle Settings Menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-64 bg-background border-r border-border">
                                <SettingsSidebar className="w-full border-r-0" />
                            </SheetContent>
                        </Sheet>
                        
                        <div className="flex items-center gap-2">
                            <div className="w-6.5 h-6.5 rounded-md bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold text-xs shadow-[0_0_10px_rgba(99,212,150,0.2)]">
                                L
                            </div>
                            <span className="font-display font-semibold text-sm tracking-tight text-foreground">Settings</span>
                        </div>
                    </div>
                    <UserNav />
                </header>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
                    <div className="max-w-4xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
