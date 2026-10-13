"use client"

import { useState } from "react"
import { Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface KillSwitchProps {
    enabled: boolean
    pending?: boolean
    onChange: (enabled: boolean) => void
}

/**
 * Global Autopilot on/off for the workspace. Turning it off asks for confirmation.
 */
export function KillSwitch({ enabled, pending, onChange }: KillSwitchProps) {
    const [confirmOff, setConfirmOff] = useState(false)

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 rounded-2xl border p-4",
                enabled ? "border-border bg-card" : "border-destructive/30 bg-destructive/5"
            )}
        >
            <div className="flex items-center gap-3">
                <Power className={cn("h-5 w-5", enabled ? "text-primary" : "text-destructive")} />
                <div>
                    <p className="text-sm font-medium text-foreground">Autopilot is {enabled ? "on" : "stopped"}</p>
                    <p className="text-xs text-muted-foreground">
                        {enabled
                            ? "Active personas can run. Stop it to halt every persona at once."
                            : "No persona will research, draft or publish until you turn it back on."}
                    </p>
                </div>
            </div>
            <Button
                variant={enabled ? "outline" : "default"}
                size="sm"
                disabled={pending}
                onClick={() => (enabled ? setConfirmOff(true) : onChange(true))}
            >
                {enabled ? "Stop all" : "Turn on"}
            </Button>

            <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Stop Autopilot?</AlertDialogTitle>
                        <AlertDialogDescription>
                            All personas stop researching, drafting and publishing. Your personas and settings are kept.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onChange(false)}>Stop all</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
