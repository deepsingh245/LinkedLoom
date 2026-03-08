import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    User,
    CreditCard,
    Settings as SettingsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { UserNav } from "./UserNav";

interface SettingsSidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function SettingsSidebar({ className }: SettingsSidebarProps) {
    const pathname = usePathname()
    return (
        <div className={cn("w-64 border-r border-[#1e1e2a] bg-[#0c0c12] p-4 flex flex-col h-screen", className)}>
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#63d496] to-[#3db87a] flex items-center justify-center text-[#0a1a10] font-bold text-lg shadow-[0_0_15px_rgba(99,212,150,0.3)]">
                    L
                </div>
                <span className="font-display font-semibold text-xl tracking-tight text-[#f0f0f8]">LinkedLoom</span>
            </div>
            
            <div className="flex-1 space-y-2 mt-4">
                <p className="px-2 text-[11px] font-semibold text-[#5a5a78] uppercase tracking-wider mb-4">Account</p>

                <NavItem href="/settings/profile" active={pathname === "/settings/profile" || pathname === "/settings"} icon={<User className="h-[18px] w-[18px]" />}>
                    Profile
                </NavItem>
                <NavItem href="/settings/billing" active={pathname === "/settings/billing"} icon={<CreditCard className="h-[18px] w-[18px]" />}>
                    Billing
                </NavItem>
                <NavItem href="/settings/preferences" active={pathname === "/settings/preferences"} icon={<SettingsIcon className="h-[18px] w-[18px]" />}>
                    Settings
                </NavItem>
            </div>
            
            <div className="pt-6 border-t border-[#1e1e2a] mt-auto pb-4 px-2">
                <div className="flex items-center gap-3">
                     <div className="h-9 w-9 bg-[#1a1a24] rounded-full flex items-center justify-center text-[#e0e0f0] font-medium border border-[#2a2a3a]">
                        SC
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-[#e0e0f0]">Sarah Chen</span>
                        <span className="text-[11px] text-[#5a5a78]">sarah.chen@vercel.com</span>
                    </div>
                </div>
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
