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
                "flex items-center justify-between gap-4 rounded-lg border p-3 md:p-4",
                enabled ? "border-[#e4ebe8] bg-[#f8fbfa]" : "border-[#efd9d9] bg-[#fff8f8]"
            )}
        >
            <div className="flex items-center gap-3">
                <Power className={cn("h-5 w-5", enabled ? "text-[#357d72]" : "text-[#b95656]")} />
                <div>
                    <p className="text-sm font-semibold text-[#283139]">Autopilot is {enabled ? "on" : "stopped"}</p>
                    <p className="mt-0.5 text-xs text-[#738078]">
                        {enabled
                            ? "Active personas can run. Stop it to halt every persona at once."
                            : "No persona will research, draft or publish until you turn it back on."}
                    </p>
                </div>
            </div>
            <Button
                variant={enabled ? "outline" : "default"}
                size="sm"
                className={cn("shrink-0 rounded-lg text-xs", enabled ? "border-[#d5e0dc] bg-white text-[#44524e] hover:bg-[#eef5f2]" : "bg-[#357d72] text-white hover:bg-[#286c63]")}
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
