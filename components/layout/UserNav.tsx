"use client"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Routes } from "@/lib/routes";
import { User, Settings, LogOut } from "lucide-react";

export function UserNav() {
    const { profile } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await api.firebaseService.logout();
            router.push(Routes.LOGIN);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-[#1e1e2a] p-0 hover:bg-[#1e1e2a] transition-all cursor-pointer">
                    <Avatar className="h-full w-full">
                        <AvatarImage src={profile?.photoURL || ''} alt={profile?.displayName || ''} className="object-cover" />
                        <AvatarFallback className="bg-[#1e1e2a] text-[#63d496] font-medium text-xs">
                            {profile?.displayName 
                                ? profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                                : profile?.email?.substring(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                className="w-60 bg-[#13131a]/95 backdrop-blur-xl border border-[#1e1e2a] p-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-100 animate-in fade-in slide-in-from-top-2 duration-200" 
                align="end" 
                forceMount
            >
                <DropdownMenuLabel className="font-normal px-3 py-3 border-b border-[#1e1e2a]/50">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none text-[#f0f0f8]">
                            {profile?.displayName || profile?.email || 'User'}
                        </p>
                        <p className="text-[11px] leading-none text-[#8888a0] truncate mt-1">
                            {profile?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="hidden" />
                <DropdownMenuGroup className="p-1">
                    <DropdownMenuItem 
                        onClick={() => router.push(Routes.SETTINGS_PROFILE)}
                        className="rounded-lg text-[#f0f0f8] focus:bg-[#1e1e2a] focus:text-[#63d496] cursor-pointer transition-colors px-3 py-2.5 text-[13px] flex items-center"
                    >
                        <User className="mr-2.5 h-4 w-4 opacity-70 group-hover:opacity-100" />
                        <span>Profile</span>
                        {/* <DropdownMenuShortcut className="text-[#5a5a78] text-[10px] ml-auto">⌘P</DropdownMenuShortcut> */}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => router.push(Routes.SETTINGS_PREFERENCES)}
                        className="rounded-lg text-[#f0f0f8] focus:bg-[#1e1e2a] focus:text-[#63d496] cursor-pointer transition-colors px-3 py-2.5 text-[13px] flex items-center"
                    >
                        <Settings className="mr-2.5 h-4 w-4 opacity-70 group-hover:opacity-100" />
                        <span>Settings</span>
                        {/* <DropdownMenuShortcut className="text-[#5a5a78] text-[10px] ml-auto">⌘S</DropdownMenuShortcut> */}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-[#1e1e2a] mx-2" />
                <div className="p-1">
                    <DropdownMenuItem 
                        onClick={handleLogout}
                        className="rounded-lg text-[#f06464] focus:bg-[#f06464]/10 focus:text-[#f06464] cursor-pointer transition-colors px-3 py-2.5 text-[13px] flex items-center"
                    >
                        <LogOut className="mr-2.5 h-4 w-4 opacity-70 group-hover:opacity-100" />
                        <span>Log out</span>
                        {/* <DropdownMenuShortcut className="text-[#f06464]/50 opacity-100 text-[10px] ml-auto">⇧⌘Q</DropdownMenuShortcut> */}
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
