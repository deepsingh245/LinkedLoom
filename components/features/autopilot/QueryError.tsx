"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Shown instead of an empty state when a list fails to load, so failures (e.g. permissions) aren't mistaken for "nothing saved yet". */
export function QueryError({ what, error, onRetry }: { what: string; error: unknown; onRetry?: () => void }) {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error")
    const permission = /permission|insufficient/i.test(message)
    return (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="space-y-1">
                    <p className="font-semibold text-foreground">Couldn&apos;t load {what}</p>
                    <p className="text-muted-foreground break-words">{message}</p>
                    {permission && (
                        <p className="text-muted-foreground">
                            Usually the Firestore security rules haven&apos;t been deployed to this project, or the app is reading a different project than the one your data was saved to.
                        </p>
                    )}
                </div>
            </div>
            {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />Try again
                </Button>
            )}
        </div>
    )
}
