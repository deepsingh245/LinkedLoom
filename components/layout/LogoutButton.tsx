"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { Routes } from "@/lib/routes";
import { dangerToast } from "@/lib/toast";

export function LogoutButton() {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setPending(true);
        try {
            await api.firebaseService.logout();
            setOpen(false);
            router.push(Routes.LOGIN);
        } catch (error) {
            console.error("Failed to log out:", error);
            dangerToast("Log out failed. Please try again.");
            setPending(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Log out"
                title="Log out"
                onClick={() => setOpen(true)}
                className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
                <LogOut className="h-[18px] w-[18px]" />
            </Button>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Log out of LinkedLoom?</AlertDialogTitle>
                    <AlertDialogDescription>You can log back in at any time.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {pending ? "Logging out…" : "Log out"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
