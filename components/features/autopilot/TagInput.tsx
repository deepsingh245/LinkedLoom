"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TagInputProps {
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    max?: number
    maxLength?: number
    className?: string
}

/**
 * Chip input: type and press Enter or comma to add, Backspace on empty input to remove the last chip.
 * Duplicates (case-insensitive) are ignored.
 */
export function TagInput({ value, onChange, placeholder, max, maxLength = 60, className }: TagInputProps) {
    const [draft, setDraft] = React.useState("")
    const atLimit = max !== undefined && value.length >= max

    const add = (raw: string) => {
        const items = raw.split(",").map((s) => s.trim()).filter(Boolean)
        if (!items.length) return
        const next = [...value]
        for (const item of items) {
            if (max !== undefined && next.length >= max) break
            if (!next.some((v) => v.toLowerCase() === item.toLowerCase())) next.push(item.slice(0, maxLength))
        }
        onChange(next)
        setDraft("")
    }

    const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

    return (
        <div className={cn("space-y-2", className)}>
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((tag, i) => (
                        <span
                            key={`${tag}-${i}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-3 py-1 text-xs text-foreground max-w-full"
                        >
                            <span className="truncate">{tag}</span>
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={`Remove ${tag}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <Input
                value={draft}
                disabled={atLimit}
                placeholder={atLimit ? `Limit of ${max} reached` : placeholder}
                onChange={(e) => {
                    const v = e.target.value
                    if (v.endsWith(",")) add(v)
                    else setDraft(v)
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        add(draft)
                    } else if (e.key === "Backspace" && !draft && value.length) {
                        remove(value.length - 1)
                    }
                }}
                onBlur={() => add(draft)}
            />
        </div>
    )
}
