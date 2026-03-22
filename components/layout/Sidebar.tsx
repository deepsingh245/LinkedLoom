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
        <div className={cn("w-64 border-r border-[#1e1e2a] bg-[#0c0c12] p-4 flex flex-col h-screen", className)}>
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#63d496] to-[#3db87a] flex items-center justify-center text-[#0a1a10] font-bold text-lg shadow-[0_0_15px_rgba(99,212,150,0.3)]">
                    L
                </div>
                <span className="font-display font-semibold text-xl tracking-tight text-[#f0f0f8]">LinkedLoom</span>
            </div>
            
            <div className="flex-1 space-y-2">
                <p className="px-2 text-[11px] font-semibold text-[#5a5a78] uppercase tracking-wider mb-4 mt-8">Menu</p>

                <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={<LayoutDashboard className="h-[18px] w-[18px]" />}>
                    Dashboard
                </NavItem>
                <NavItem href="/create" active={pathname === "/create"} icon={<PenTool className="h-[18px] w-[18px]" />}>
                    Create Post
                </NavItem>
                <NavItem href="/schedule" active={pathname === "/schedule"} icon={<Calendar className="h-[18px] w-[18px]" />}>
                    Content Library
                </NavItem>
                <NavItem href="/analytics" active={pathname === "/analytics"} icon={<BarChart3 className="h-[18px] w-[18px]" />}>
                    Analytics
                </NavItem>
            </div>
            
            <div className="pt-6 border-t border-[#1e1e2a] mt-auto">
                <NavItem href="/settings/profile" active={pathname.startsWith("/settings")} icon={<Settings className="h-[18px] w-[18px]" />}>
                    Settings
                </NavItem>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium rounded-xl text-[#f06464] hover:bg-[#2a1a1a] transition-all duration-200 mt-2"
                >
                    <LogOut className="h-[18px] w-[18px]" />
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
                    ? "bg-[#1a1a24] text-[#e0e0f0] shadow-[inset_2px_0_0_#63d496]" 
                    : "text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#e0e0f0]"
            )}
        >
            <div className={cn(
                "transition-colors", 
                active ? "text-[#63d496]" : "text-[#5a5a78] group-hover:text-[#63d496]"
            )}>
                {icon}
            </div>
            {children}
        </Link>
    );
}
