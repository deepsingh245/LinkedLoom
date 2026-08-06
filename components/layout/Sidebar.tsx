import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    PenTool,
    Calendar,
    BarChart3,
    Settings,
    LogOut
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }
    return (
        <div className={cn("w-64 border-r border-border bg-background p-4 flex flex-col h-screen", className)}>
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-[0_0_15px_rgba(99,212,150,0.3)]">
                    L
                </div>
                <span className="font-display font-semibold text-xl tracking-tight text-foreground">LinkedLoom</span>
            </div>
            
            <div className="flex-1 space-y-2">
                <p className="px-2 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-4 mt-8">Menu</p>

                <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={<LayoutDashboard className="h-4.5 w-4.5" />}>
                    Dashboard
                </NavItem>
                <NavItem href="/create" active={pathname === "/create"} icon={<PenTool className="h-4.5 w-4.5" />}>
                    Create Post
                </NavItem>
                <NavItem href="/schedule" active={pathname === "/schedule"} icon={<Calendar className="h-4.5 w-4.5" />}>
                    Content Library
                </NavItem>
                <NavItem href="/analytics" active={pathname === "/analytics"} icon={<BarChart3 className="h-4.5 w-4.5" />}>
                    Analytics
                </NavItem>
            </div>
            
            <div className="pt-6 border-t border-border mt-auto">
                <NavItem href="/settings/profile" active={pathname.startsWith("/settings")} icon={<Settings className="h-4.5 w-4.5" />}>
                    Settings
                </NavItem>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200 mt-2"
                >
                    <LogOut className="h-4.5 w-4.5" />
                    Logout
                </button>
            </div>
        </div>
    );
}

function NavItem({ href, icon, children, active }: { href: string; icon: React.ReactNode; children: React.ReactNode; active?: boolean }) {
    return (
        <Link 
            href={href}
            className={cn(
                "flex items-center gap-3 px-4 py-3 text-[14px] font-medium rounded-xl transition-all duration-200 group",
                active 
                    ? "bg-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
        >
            <div className={cn(
                "transition-colors", 
                active ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary"
            )}>
                {icon}
            </div>
            {children}
        </Link>
    );
}
