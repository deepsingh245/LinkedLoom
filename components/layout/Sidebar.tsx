import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }
    return (
        <div className={cn("pb-12 h-screen border-r bg-sidebar", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary flex items-center gap-2">
                        <span className="text-2xl">⚡</span> LinkGenie
                    </h2>
                    <div className="space-y-1">
                        <NavItem href="/dashboard" icon={<LayoutDashboard className="mr-2 h-4 w-4" />}>
                            Dashboard
                        </NavItem>
                        <NavItem href="/create" icon={<PenTool className="mr-2 h-4 w-4" />}>
                            Create Post
                        </NavItem>
                        <NavItem href="/schedule" icon={<Calendar className="mr-2 h-4 w-4" />}>
                            Content Library
                        </NavItem>
                        <NavItem href="/calendar" icon={<Calendar className="mr-2 h-4 w-4" />}>
                            Calendar
                        </NavItem>
                        {/* <NavItem href="/analytics" icon={<BarChart3 className="mr-2 h-4 w-4" />}>
                            Analytics
                        </NavItem> */}
                    </div>
                </div>
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
                        Settings
                    </h2>
                    <div className="space-y-1">
                        <NavItem href="/settings" icon={<Settings className="mr-2 h-4 w-4" />}>
                            Settings
                        </NavItem>
                        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
    // Simple mock of usePathname since we are in a server component mostly, but sidebar is client usually.
    // Actually sidebar should be client to check active state.
    return (
        <Button asChild variant="ghost" className="w-full justify-start">
            <Link href={href}>
                {icon}
                {children}
            </Link>
        </Button>
    );
}
