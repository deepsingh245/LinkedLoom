"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Routes } from "@/lib/routes";
import { BarChart3, Bot, CalendarDays, LayoutDashboard, Menu, Moon, PenTool, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/auth-provider";
import { updateUserProfile } from "@/lib/firebase/user";
import type { UserPreferences } from "@/types";
import { applyDisplayPreferences, mergePreferences } from "@/lib/preferences";

const AUTOPILOT_ENABLED = process.env.NEXT_PUBLIC_AUTOPILOT_ENABLED === "true";

const routeNames: Array<[string, string]> = [
    [Routes.SETTINGS_BILLING, "Settings & Billing"],
    [Routes.SETTINGS_PREFERENCES, "Preferences"],
    [Routes.SETTINGS_CONNECTIONS, "Connections & Integrations"],
    [Routes.SETTINGS_PROFILE, "Profile"],
    [Routes.AUTOPILOT_NEW, "New pipeline"],
    [Routes.AUTOPILOT_STUDIO, "Persona Studio"],
    [Routes.AUTOPILOT_CREDITS, "Autopilot credits"],
    [Routes.AUTOPILOT_AI, "AI keys"],
    [Routes.AUTOPILOT, "Autopilot"],
    [Routes.CREATE_POST, "Content Studio"],
    [Routes.SCHEDULE, "Content Library"],
    [Routes.CALENDAR, "Calendar & Queue"],
    [Routes.ANALYTICS, "Analytics"],
    [Routes.DASHBOARD, "Overview"],
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();
    const { profile } = useAuth();
    const isSettings = pathname.startsWith("/settings");
    const currentPage = routeNames.find(([route]) => pathname === route || (route !== Routes.DASHBOARD && pathname.startsWith(`${route}/`)))?.[1] ?? "Workspace";

    useEffect(() => setOpen(false), [pathname]);
    useEffect(() => {
        const savedTheme = profile?.preferences?.theme;
        if (savedTheme) setTheme(savedTheme);
    }, [profile?.preferences?.theme, setTheme]);
    useEffect(() => {
        applyDisplayPreferences(mergePreferences(profile?.preferences));
    }, [profile?.preferences]);

    const toggleTheme = () => {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        if (profile?.uid) {
            const preferences: UserPreferences = { ...mergePreferences(profile.preferences), theme: nextTheme };
            void updateUserProfile(profile.uid, { preferences }).catch((error) => {
                console.error("Failed to save theme preference:", error);
            });
        }
    };

    return (
        <div className="dashboard-theme fixed inset-0 flex h-dvh overflow-hidden bg-background font-sans antialiased text-foreground">
            <Sidebar className="hidden lg:flex" />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="z-20 flex h-[58px] shrink-0 items-center justify-between border-b border-border bg-card/95 px-3 backdrop-blur md:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-accent lg:hidden" aria-label="Open navigation">
                                    <Menu className="h-[18px] w-[18px]" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[260px] border-border bg-card p-0">
                                <Sidebar className="w-full border-r-0" />
                            </SheetContent>
                        </Sheet>

                        <Link href={Routes.DASHBOARD} aria-label="LinkedLoom overview" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#357d72] text-sm font-bold text-white sm:hidden">L</Link>
                        <div className="flex min-w-0 items-center gap-2 text-xs">
                            <span className="hidden text-muted-foreground sm:inline">Workspace</span>
                            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
                            <span className="truncate font-semibold text-foreground">{currentPage}</span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`} className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                            {resolvedTheme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                        </Button>
                        <span className="hidden h-6 w-px bg-border sm:block" />
                        <LogoutButton />
                    </div>
                </header>

                <main className={cn("min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-4 md:px-6 md:pt-6 lg:pb-6", isSettings && "px-4 py-6 md:px-8 md:py-8")}>
                    {isSettings ? <div className="mx-auto w-full max-w-4xl">{children}</div> : children}
                </main>

                <MobileNavigation />
            </div>
        </div>
    );
}

function MobileNavigation() {
    const pathname = usePathname();
    const items = [
        { label: "Home", href: Routes.DASHBOARD, icon: LayoutDashboard },
        { label: "Create", href: Routes.CREATE_POST, icon: PenTool },
        { label: "Calendar", href: Routes.CALENDAR, icon: CalendarDays },
        { label: "Analytics", href: Routes.ANALYTICS, icon: BarChart3 },
        ...(AUTOPILOT_ENABLED ? [{ label: "Autopilot", href: Routes.AUTOPILOT, icon: Bot }] : []),
    ];

    return (
        <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card/95 px-1 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || (href !== Routes.DASHBOARD && pathname.startsWith(`${href}/`));
                return (
                    <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-primary")}>
                        <Icon className="h-[18px] w-[18px]" />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
