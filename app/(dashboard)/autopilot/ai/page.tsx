"use client"

import { useState } from "react"
import { KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { useAuth } from "@/components/providers/auth-provider"
import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav"
import { useAddAIConnection, useAIConnections, useRevokeAIConnection, useTestAIConnection } from "@/lib/query/hooks/use-ai-billing"
import type { AIConnection, AIProviderId } from "@/types/ai"

const providerName = (p: AIProviderId) => (p === "openai" ? "OpenAI" : "Google Gemini")

function AddKeyDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (v: boolean) => void; userId?: string }) {
    const add = useAddAIConnection(userId)
    const [provider, setProvider] = useState<AIProviderId>("gemini")
    const [label, setLabel] = useState("")
    const [apiKey, setApiKey] = useState("")

    const close = (v: boolean) => {
        if (!v) {
            setApiKey("")
            setLabel("")
        }
        onOpenChange(v)
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add your own API key</DialogTitle>
                    <DialogDescription>
                        We check the key, store it encrypted in Google Cloud Secret Manager and never show it again. Only the last 4 characters are kept for display.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                        e.preventDefault()
                        try {
                            await add.mutateAsync({ provider, label: label || providerName(provider), apiKey })
                            close(false)
                        } catch {
                            // toasted by the hook
                        }
                    }}
                >
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={provider} onValueChange={(v) => setProvider(v as AIProviderId)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini">Google Gemini</SelectItem>
                                <SelectItem value="openai">OpenAI</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="key-label">Label</Label>
                        <Input id="key-label" maxLength={40} placeholder={`My ${providerName(provider)} key`} value={label} onChange={(e) => setLabel(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="api-key">API key</Label>
                        <Input
                            id="api-key"
                            type="password"
                            autoComplete="off"
                            spellCheck={false}
                            required
                            minLength={10}
                            maxLength={300}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => close(false)} disabled={add.isPending}>Cancel</Button>
                        <Button type="submit" disabled={add.isPending || apiKey.trim().length < 10}>
                            {add.isPending ? "Verifying..." : "Verify & save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function ConnectionRow({ connection, userId }: { connection: AIConnection; userId?: string }) {
    const test = useTestAIConnection(userId)
    const revoke = useRevokeAIConnection(userId)
    const [confirm, setConfirm] = useState(false)
    const busy = test.isPending || revoke.isPending

    return (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{connection.label}</p>
                        <Badge variant={connection.status === "active" ? "published" : "draft"}>
                            {connection.status === "active" ? "Working" : "Key rejected"}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {providerName(connection.provider)} · {connection.keyHint}
                        {connection.lastValidatedAt ? ` · checked ${connection.lastValidatedAt.toLocaleString()}` : ""}
                    </p>
                    {connection.lastError && <p className="text-xs text-destructive">{connection.lastError}</p>}
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => test.mutate(connection.id)}>
                    <RefreshCw className="mr-1 h-4 w-4" /> {test.isPending ? "Testing..." : "Test"}
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirm(true)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                </Button>
            </div>

            <AlertDialog open={confirm} onOpenChange={setConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove “{connection.label}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The key is deleted from Secret Manager. Personas using it switch to LinkedLoom credits.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revoke.mutate(connection.id)}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}

export default function AIKeysPage() {
    const { user } = useAuth()
    const { data: connections = [], isLoading } = useAIConnections(user?.uid)
    const [open, setOpen] = useState(false)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Autopilot</h1>
                <p className="text-muted-foreground">Use your own Gemini or OpenAI key so personas bill your provider account instead of LinkedLoom credits.</p>
            </div>
            <AutopilotNav />

            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">AI keys</h2>
                <Button onClick={() => setOpen(true)} disabled={connections.length >= 5}>
                    <Plus className="mr-2 h-4 w-4" /> Add key
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : connections.length === 0 ? (
                <Card className="p-10 text-center space-y-2">
                    <KeyRound className="mx-auto h-8 w-8 text-primary" />
                    <p className="font-medium text-foreground">No keys yet</p>
                    <p className="text-sm text-muted-foreground">Personas use LinkedLoom credits until you add a key.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {connections.map((c) => <ConnectionRow key={c.id} connection={c} userId={user?.uid} />)}
                </div>
            )}

            <AddKeyDialog open={open} onOpenChange={setOpen} userId={user?.uid} />
        </div>
    )
}
