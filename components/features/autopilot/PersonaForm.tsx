"use client"

import * as React from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Lock, Plus, Trash2, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { TagInput } from "./TagInput"
import { PERSONA_LIMITS, personaFormSchema, type PersonaFormValues } from "@/lib/schemas/persona"
import type { Persona, PersonaInput } from "@/types/autopilot"
import type { AIConnection } from "@/types/ai"

const MANAGED = "managed"

const browserTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
        return "UTC"
    }
}

const allTimeZones = (): string[] => {
    try {
        return (Intl as unknown as { supportedValuesOf: (key: "timeZone") => string[] }).supportedValuesOf("timeZone")
    } catch {
        return ["UTC"]
    }
}

export const emptyPersona = (): PersonaFormValues => ({
    name: "",
    description: "",
    identity: { role: "", targetAudience: "", tone: "professional", language: "English", customInstructions: "" },
    research: { topics: [], keywords: [], excludedTopics: [], feedUrls: [], freshnessHours: 48, minSourceCount: 2, webSearch: false, autoRun: false },
    publishing: {
        accountIds: ["linkedin"],
        postsPerDay: 1,
        timezone: browserTimeZone(),
        postingWindows: [{ start: "09:00", end: "11:00" }],
        approvalMode: "manual",
        allowImages: false,
    },
    ai: { connectionId: MANAGED, modelProfile: "balanced", monthlyCreditLimit: 1000 },
})

export const personaToFormValues = (p: Persona): PersonaFormValues => ({
    name: p.name,
    description: p.description ?? "",
    identity: { ...p.identity, customInstructions: p.identity.customInstructions ?? "" },
    research: {
        topics: p.research.topics ?? [],
        keywords: p.research.keywords ?? [],
        excludedTopics: p.research.excludedTopics ?? [],
        feedUrls: p.research.feedUrls ?? [],
        freshnessHours: p.research.freshnessHours,
        minSourceCount: p.research.minSourceCount,
        webSearch: p.research.webSearch ?? false,
        autoRun: p.research.autoRun ?? false,
    },
    publishing: { ...p.publishing, approvalMode: "manual" },
    ai: { connectionId: p.ai.connectionId ?? MANAGED, modelProfile: p.ai.modelProfile, monthlyCreditLimit: p.ai.monthlyCreditLimit },
})

/** Strip empty optional strings so the backend clears them instead of storing "". */
const toInput = (v: PersonaFormValues): PersonaInput => ({
    ...v,
    description: v.description?.trim() || undefined,
    identity: { ...v.identity, customInstructions: v.identity.customInstructions?.trim() || undefined },
    ai: {
        modelProfile: v.ai.modelProfile,
        monthlyCreditLimit: v.ai.monthlyCreditLimit,
        ...(v.ai.connectionId !== MANAGED ? { connectionId: v.ai.connectionId } : {}),
    },
})

const numberField = (onChange: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? 0 : Number(e.target.value))

interface PersonaFormProps {
    defaultValues: PersonaFormValues
    submitLabel: string
    onSubmit: (input: PersonaInput) => Promise<unknown>
    onCancel?: () => void
    disabled?: boolean
    /** BYOK connections the persona can use instead of managed credits. */
    connections?: AIConnection[]
}

export function PersonaForm({ defaultValues, submitLabel, onSubmit, onCancel, disabled, connections = [] }: PersonaFormProps) {
    const form = useForm<PersonaFormValues>({
        resolver: zodResolver(personaFormSchema),
        defaultValues,
    })
    const windows = useFieldArray({ control: form.control, name: "publishing.postingWindows" })
    const timeZones = React.useMemo(() => allTimeZones(), [])
    const { isSubmitting } = form.formState

    const submit = async (values: PersonaFormValues) => {
        try {
            await onSubmit(toInput(values))
        } catch {
            // Errors are toasted by the mutation hooks.
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
                <fieldset disabled={disabled || isSubmitting} className="space-y-6">
                    {/* Essential persona details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Persona basics</CardTitle>
                            <CardDescription>Start with the few details that shape this persona&apos;s voice.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl><Input placeholder="AI & Technology Expert" maxLength={PERSONA_LIMITS.nameMax} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="identity.role" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <FormControl><Input placeholder="Senior software engineer" maxLength={PERSONA_LIMITS.roleMax} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="identity.targetAudience" render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Target audience</FormLabel>
                                    <FormControl><Input placeholder="Developers and engineering managers at startups" maxLength={PERSONA_LIMITS.audienceMax} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="identity.tone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tone</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="professional">Professional</SelectItem>
                                            <SelectItem value="casual">Casual</SelectItem>
                                            <SelectItem value="technical">Technical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Description <span className="text-muted-foreground/60">(optional)</span></FormLabel>
                                    <FormControl><Input maxLength={PERSONA_LIMITS.descriptionMax} {...field} value={field.value ?? ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    {/* Main creation input */}
                    <Card>
                        <CardHeader>
                            <CardTitle>What should this persona talk about?</CardTitle>
                            <CardDescription>Add a few topics. Press Enter or comma after each one.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <FormField control={form.control} name="research.topics" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Topics</FormLabel>
                                    <FormControl><TagInput value={field.value} onChange={field.onChange} max={PERSONA_LIMITS.topicsMax} placeholder="AI releases, developer tools" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    {/* Publishing settings are part of the main setup. */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Publishing</CardTitle>
                            <CardDescription>Choose when this persona should prepare drafts. Every draft still needs your approval.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <FormItem>
                                    <FormLabel>Platform</FormLabel>
                                    <Input value="LinkedIn" disabled />
                                    <FormDescription>More platforms later.</FormDescription>
                                </FormItem>
                                <FormField control={form.control} name="publishing.postsPerDay" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Posts per day</FormLabel>
                                        <FormControl><Input type="number" min={1} max={PERSONA_LIMITS.postsPerDayMax} value={field.value} onChange={numberField(field.onChange)} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="publishing.timezone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Time zone</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent className="max-h-72">
                                                {timeZones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="space-y-2">
                                <FormLabel>Posting windows</FormLabel>
                                {windows.fields.map((w, index) => (
                                    <div key={w.id} className="flex items-start gap-2">
                                        <FormField control={form.control} name={`publishing.postingWindows.${index}.start`} render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <span className="pt-2 text-muted-foreground">–</span>
                                        <FormField control={form.control} name={`publishing.postingWindows.${index}.end`} render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => windows.remove(index)} disabled={windows.fields.length <= 1} aria-label="Remove window">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <p className="text-[0.8rem] font-medium text-destructive">
                                    {form.formState.errors.publishing?.postingWindows?.root?.message ?? form.formState.errors.publishing?.postingWindows?.message}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => windows.append({ start: "17:00", end: "18:00" })}
                                    disabled={windows.fields.length >= PERSONA_LIMITS.postingWindowsMax}
                                >
                                    <Plus className="mr-1 h-4 w-4" /> Add window
                                </Button>
                            </div>

                            <div className="flex items-start gap-3 rounded-xl border border-border bg-accent/40 p-4 text-sm">
                                <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">Manual approval</p>
                                    <p className="text-muted-foreground">Every draft waits for your approval before it&apos;s scheduled. Automatic publishing will be an explicit opt-in later.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <details className="group rounded-xl border border-border bg-card shadow-sm">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                            <span className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-muted-foreground"><SlidersHorizontal className="h-4 w-4" /></span>
                                <span>
                                    <span className="block text-sm font-semibold text-foreground">Advanced settings</span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">Optional controls. We&apos;ve filled in sensible defaults for you.</span>
                                </span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="grid gap-6 border-t border-border p-5">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Voice details</CardTitle>
                                    <CardDescription>Optional guidance for the writing assistant.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <FormField control={form.control} name="identity.language" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Writing language</FormLabel>
                                            <FormControl><Input placeholder="English" {...field} /></FormControl>
                                            <FormDescription>Defaults to English.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="identity.customInstructions" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Custom instructions <span className="text-muted-foreground/60">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Textarea rows={4} maxLength={PERSONA_LIMITS.customInstructionsMax} placeholder="Always end with a question. Avoid hype words." {...field} value={field.value ?? ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            {/* Research */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Research sources and filters</CardTitle>
                                    <CardDescription>Fine-tune how the persona finds relevant material.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                            <FormField control={form.control} name="research.keywords" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Keywords <span className="text-muted-foreground/60">(optional)</span></FormLabel>
                                    <FormControl><TagInput value={field.value} onChange={field.onChange} max={PERSONA_LIMITS.keywordsMax} placeholder="LLM, agents, TypeScript" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="research.excludedTopics" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Excluded topics <span className="text-muted-foreground/60">(optional)</span></FormLabel>
                                    <FormControl><TagInput value={field.value} onChange={field.onChange} max={PERSONA_LIMITS.excludedTopicsMax} placeholder="Politics, crypto" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="research.feedUrls" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RSS / Atom feeds <span className="text-muted-foreground/60">(optional)</span></FormLabel>
                                    <FormControl><TagInput value={field.value} onChange={field.onChange} max={PERSONA_LIMITS.feedUrlsMax} maxLength={2048} placeholder="https://example.com/feed.xml" /></FormControl>
                                    <FormDescription>Research reads these feeds when you start a run or enable automatic research.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField control={form.control} name="research.freshnessHours" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Freshness window (hours)</FormLabel>
                                        <FormControl><Input type="number" min={1} max={PERSONA_LIMITS.freshnessHoursMax} value={field.value} onChange={numberField(field.onChange)} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="research.minSourceCount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Minimum sources per post</FormLabel>
                                        <FormControl><Input type="number" min={1} max={PERSONA_LIMITS.minSourceCountMax} value={field.value} onChange={numberField(field.onChange)} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="research.webSearch" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Web search (Gemini)</FormLabel>
                                        <Select value={field.value ? "on" : "off"} onValueChange={(v) => field.onChange(v === "on")}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="off">Off – only my RSS feeds</SelectItem>
                                                <SelectItem value="on">On – also search Google for fresh articles</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Extra cost per run (search is billed per query). Needs Gemini billing: LinkedLoom credits or your own Gemini key.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="research.autoRun" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Automatic research</FormLabel>
                                        <Select value={field.value ? "on" : "off"} onValueChange={(v) => field.onChange(v === "on")}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="off">Off – run research myself</SelectItem>
                                                <SelectItem value="on">On – run before posting windows</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Runs about 90 minutes before each posting window, pauses when 6 drafts await review, and uses LinkedLoom credits or your key. Add a feed or turn on web search first. Drafts still need your approval.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </CardContent>
                            </Card>

                    {/* AI */}
                    <Card>
                        <CardHeader>
                            <CardTitle>AI & budget</CardTitle>
                            <CardDescription>Quality vs cost, and a hard monthly limit.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <FormField control={form.control} name="ai.connectionId" render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Billing</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value={MANAGED}>LinkedLoom credits (managed)</SelectItem>
                                            {connections.filter((c) => c.status === "active" || c.id === field.value).map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    Your {c.provider === "openai" ? "OpenAI" : "Gemini"} key · {c.label} ({c.keyHint})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        With your own key you pay the provider directly and no credits are used. Manage keys under AI keys.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="ai.modelProfile" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Model profile</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="economy">Economy</SelectItem>
                                            <SelectItem value="balanced">Balanced</SelectItem>
                                            <SelectItem value="quality">Quality</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="ai.monthlyCreditLimit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monthly credit limit</FormLabel>
                                    <FormControl><Input type="number" min={0} max={PERSONA_LIMITS.monthlyCreditLimitMax} value={field.value} onChange={numberField(field.onChange)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>
                        </div>
                    </details>
                </fieldset>

                <div className="flex justify-end gap-3">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={disabled || isSubmitting}>
                        {isSubmitting ? "Saving..." : submitLabel}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
