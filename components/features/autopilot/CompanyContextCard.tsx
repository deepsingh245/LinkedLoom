"use client"

import { useRef, useState } from "react"
import { FileText, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QueryError } from "@/components/features/autopilot/QueryError"
import { CONTEXT_LIMITS } from "@/lib/firebase/context"
import { useAddContextDoc, useContextDocs, useDeleteContextDoc, useUpdateContextDoc } from "@/lib/query/hooks/use-context"
import { dangerToast } from "@/lib/toast"
import type { Persona } from "@/types/autopilot"

const ACCEPT = ".md,.markdown,.txt,text/markdown,text/plain"
const EXT_RE = /\.(md|markdown|txt)$/i
// Browser-side guard so huge files aren't read at all; the server enforces the exact limits.
const MAX_BYTES = CONTEXT_LIMITS.maxCharsPerFile * 4

const fmt = (n: number) => n.toLocaleString("en-US")

interface CompanyContextCardProps {
    userId?: string
    personas: Persona[]
}

/**
 * Upload .md / .txt files with company info, brand guidelines, products… Autopilot adds them to its
 * prompts so drafts are specific to the company without retyping it in every persona.
 */
export function CompanyContextCard({ userId, personas }: CompanyContextCardProps) {
    const { data: docs = [], isLoading, error, refetch } = useContextDocs(userId)
    const add = useAddContextDoc(userId)
    const update = useUpdateContextDoc(userId)
    const remove = useDeleteContextDoc(userId)
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [scope, setScope] = useState("all")

    const personaName = (id: string | null) => (id ? personas.find((p) => p.id === id)?.name ?? "Unknown persona" : "All personas")
    const totalChars = docs.reduce((sum, d) => sum + d.size, 0)
    const enabledChars = docs.filter((d) => d.enabled).reduce((sum, d) => sum + d.size, 0)
    const overBudget = enabledChars > CONTEXT_LIMITS.promptChars
    const usable = personas.filter((p) => p.status !== "archived")

    async function onFiles(files: FileList | null) {
        if (!files?.length) return
        setUploading(true)
        try {
            for (const file of Array.from(files)) {
                if (!EXT_RE.test(file.name)) {
                    dangerToast(`${file.name}: only .md and .txt files are supported.`)
                    continue
                }
                if (file.size > MAX_BYTES) {
                    dangerToast(`${file.name}: too large. Files can be up to ${fmt(CONTEXT_LIMITS.maxCharsPerFile)} characters.`)
                    continue
                }
                await add.mutateAsync({ file, personaId: scope === "all" ? null : scope }).catch(() => undefined)
            }
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ""
        }
    }

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-[#283139]">Company context</h2>
                    <p className="mt-1 max-w-2xl text-[11px] text-[#89939a]">
                        Upload .md or .txt files about your company, brand voice, products or audience. Autopilot reads them when it writes, so posts are specific to you without
                        retyping it for every persona.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={scope} onValueChange={setScope}>
                        <SelectTrigger aria-label="Which persona uses the next upload" className="h-9 w-[190px] rounded-lg border-[#cfd8dc] bg-white text-[11px] text-[#38434a]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Use for all personas</SelectItem>
                            {usable.map((p) => <SelectItem key={p.id} value={p.id}>Only {p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(event) => onFiles(event.target.files)} />
                    <Button type="button" disabled={uploading || docs.length >= CONTEXT_LIMITS.maxFiles} onClick={() => inputRef.current?.click()} className="h-9 rounded-lg bg-[#357d72] px-3 text-xs font-semibold text-white hover:bg-[#286c63]">
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload files
                    </Button>
                </div>
            </div>

            {error ? (
                <QueryError what="your context files" error={error} onRetry={() => refetch()} />
            ) : isLoading ? null : docs.length === 0 ? (
                <Card className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#dfe5e7] bg-white p-6 text-center shadow-none">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f3f0] text-[#357d72]"><FileText className="h-4 w-4" /></span>
                    <p className="text-xs font-semibold text-[#38434a]">No company files yet</p>
                    <p className="max-w-md text-[11px] leading-relaxed text-[#7c878e]">
                        Try a short about-us page, a brand guidelines doc or a product list (up to {fmt(CONTEXT_LIMITS.maxCharsPerFile)} characters each, {CONTEXT_LIMITS.maxFiles} files).
                    </p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {docs.map((doc) => (
                        <Card key={doc.id} className="flex flex-col gap-3 rounded-xl border border-[#e2e6ea] bg-white p-3 shadow-none sm:flex-row sm:items-start md:p-4">
                            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-medium text-[#46515a]">
                                <input type="checkbox" checked={doc.enabled} disabled={update.isPending} onChange={(event) => update.mutate({ docId: doc.id, enabled: event.target.checked })} className="h-4 w-4 accent-[#357d72]" aria-label={`Use ${doc.name}`} />
                                Use
                            </label>
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#303a40]">
                                    <FileText className="h-3.5 w-3.5 text-[#357d72]" />{doc.name}
                                    <span className="text-[10px] font-normal text-[#89939a]">{fmt(doc.size)} characters</span>
                                </p>
                                <p className="mt-1 line-clamp-2 text-[11px] text-[#7c878e]">{doc.preview}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Select value={doc.personaId ?? "all"} onValueChange={(value) => update.mutate({ docId: doc.id, personaId: value === "all" ? null : value })}>
                                    <SelectTrigger aria-label={`Persona for ${doc.name}`} className="h-8 w-[170px] rounded-lg border-[#cfd8dc] bg-white text-[11px] text-[#38434a]"><SelectValue>{personaName(doc.personaId)}</SelectValue></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All personas</SelectItem>
                                        {usable.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button type="button" variant="ghost" size="icon" disabled={remove.isPending} onClick={() => remove.mutate(doc.id)} aria-label={`Delete ${doc.name}`} className="h-8 w-8 text-[#9c5d5d] hover:bg-[#fff3f3]">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                    <p className={`text-[11px] ${overBudget ? "text-[#a67b37]" : "text-[#89939a]"}`}>
                        {fmt(totalChars)} / {fmt(CONTEXT_LIMITS.maxTotalChars)} characters stored · {fmt(Math.min(enabledChars, CONTEXT_LIMITS.promptChars))} of {fmt(CONTEXT_LIMITS.promptChars)} used per post
                        {overBudget ? ` — files beyond the first ${fmt(CONTEXT_LIMITS.promptChars)} characters are cut for each post, so turn off files you don't need.` : "."}
                    </p>
                </div>
            )}
            <p className="text-[10px] leading-relaxed text-[#9aa4aa]">
                Files are stored privately in your workspace and parts of them are sent to the AI provider that writes your drafts. Don&apos;t upload secrets or confidential data you can&apos;t share with an AI provider.
                Fact-checking still requires every claim about the outside world to be supported by its sources; your files count as support only for statements about your own company.
            </p>
        </section>
    )
}
