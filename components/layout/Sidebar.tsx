import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Activity,
    BarChart3,
    Bot,
    CalendarDays,
    CircleHelp,
    FileText,
    LayoutDashboard,
    PenTool,
    SlidersHorizontal,
    Workflow,
    Unplug,
    CreditCard,
} from "lucide-react";
import { Routes } from "@/lib/routes";

const AUTOPILOT_ENABLED = process.env.NEXT_PUBLIC_AUTOPILOT_ENABLED === "true";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

const primaryItems = [
    { label: "Overview", href: Routes.DASHBOARD, icon: LayoutDashboard },
    { label: "Content Studio", href: Routes.CREATE_POST, icon: PenTool },
    { label: "Content Library", href: Routes.SCHEDULE, icon: FileText },
    { label: "Calendar & Queue", href: Routes.CALENDAR, icon: CalendarDays },
    { label: "Analytics", href: Routes.ANALYTICS, icon: BarChart3 },
];

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { profile } = useAuth();
    const initials = profile?.displayName
        ? profile.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
        : profile?.email?.slice(0, 2).toUpperCase() || "?";

    return (
        <aside className={cn(
            "flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-card px-3 py-4 text-foreground",
            className,
        )}>
            <Link href={Routes.DASHBOARD} className="mb-5 flex items-center gap-2.5 px-2.5" aria-label="LinkedLoom overview">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#357d72] text-base font-bold text-white">L</span>
                <span className="font-semibold tracking-[-0.03em]">LinkedLoom</span>
            </Link>

            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-border bg-muted/50 p-2.5 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">LL</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">My Workspace</span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">Workspace</span>
                </span>
            </div>

            <div className="flex-1 overflow-y-auto">
                <p className="mb-2 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
                <nav aria-label="Workspace navigation" className="space-y-1">
                    {primaryItems.map((item) => (
                        <NavItem key={item.href} href={item.href} active={isActive(pathname, item.href)} icon={<item.icon className="h-4 w-4" />}>
                            {item.label}
                        </NavItem>
                    ))}
                    {AUTOPILOT_ENABLED && (
                        <>
                            <NavItem href={Routes.AUTOPILOT} active={pathname.startsWith(Routes.AUTOPILOT)} icon={<Bot className="h-4 w-4" />}>Autopilot</NavItem>
                        </>
                    )}
                </nav>

                <p className="mb-2 mt-6 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Manage</p>
                <nav aria-label="Account navigation" className="space-y-1">
                    <NavItem href={Routes.SETTINGS_PROFILE} active={pathname === Routes.SETTINGS_PROFILE} icon={
                        <Avatar className="h-5 w-5 border border-border">
                            <AvatarImage src={profile?.photoURL || ""} alt={profile?.displayName || ""} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-[8px] font-semibold text-primary">{initials}</AvatarFallback>
                        </Avatar>
                    }>Profile</NavItem>
                    <NavItem href={Routes.SETTINGS_PREFERENCES} active={pathname === Routes.SETTINGS_PREFERENCES} icon={<SlidersHorizontal className="h-4 w-4" />}>Preferences</NavItem>
                    <NavItem href={Routes.SETTINGS_CONNECTIONS} active={pathname === Routes.SETTINGS_CONNECTIONS || pathname.startsWith(`${Routes.SETTINGS_CONNECTIONS}/`)} icon={<Unplug className="h-4 w-4" />}>Connections</NavItem>
                    <NavItem href={Routes.SETTINGS_BILLING} active={pathname === Routes.SETTINGS_BILLING || pathname.startsWith(`${Routes.SETTINGS_BILLING}/`)} icon={<CreditCard className="h-4 w-4" />}>Settings & Billing</NavItem>
                </nav>

                <div className="mt-5 border-t border-border pt-3">
                    <p className="mb-2 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Coming later</p>
                    <div className="space-y-1">
                        <UnavailableItem icon={<Workflow className="h-4 w-4" />}>Persona Studio</UnavailableItem>
                    </div>
                </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
                {AUTOPILOT_ENABLED && <Link href={Routes.AUTOPILOT_NEW} className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">
                    <Activity className="h-4 w-4" />
                    New pipeline
                </Link>}
                <div className="flex items-center gap-2 px-2.5 py-2 text-[10px] text-muted-foreground">
                    <CircleHelp className="h-3.5 w-3.5" />LinkedLoom workspace
                </div>
            </div>
        </aside>
    );
}

function isActive(pathname: string, href: string) {
    return pathname === href || (href !== Routes.DASHBOARD && pathname.startsWith(`${href}/`));
}

function NavItem({ href, icon, children, active, indicator }: { href: string; icon: React.ReactNode; children: React.ReactNode; active?: boolean; indicator?: boolean }) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "group flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
        >
            <span className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")}>{icon}</span>
            <span className="flex-1">{children}</span>
            {indicator && <span className="h-1.5 w-1.5 rounded-full bg-[#51a37c]" />}
        </Link>
    );
}

function UnavailableItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div aria-disabled="true" title="This area is not available yet" className="flex min-h-9 cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-medium text-muted-foreground/70">
            {icon}<span className="flex-1">{children}</span><span className="text-[9px]">Soon</span>
        </div>
    );
}
