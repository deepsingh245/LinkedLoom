import { z } from "zod";
import { APPROVAL_MODES, MODEL_PROFILES, PERSONA_LIMITS as L, PERSONA_STATUSES, PLATFORMS, TONES } from "./limits";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeZone(tz: string): boolean {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

const tag = z.string().trim().min(1).max(L.tagMax);

const uniqueList = (max: number) =>
    z.array(tag).max(max).transform((items) => Array.from(new Set(items)));

const httpsUrl = z
    .string()
    .trim()
    .max(2048)
    .refine((value) => {
        try {
            return new URL(value).protocol === "https:";
        } catch {
            return false;
        }
    }, { message: "Feed URLs must be valid https:// URLs." });

const postingWindow = z
    .object({
        start: z.string().regex(TIME_RE, { message: "Use HH:mm." }),
        end: z.string().regex(TIME_RE, { message: "Use HH:mm." }),
    })
    .refine((w) => w.start < w.end, { message: "Window start must be before end.", path: ["end"] });

export const personaInputSchema = z
    .object({
        name: z.string().trim().min(1, { message: "Name is required." }).max(L.nameMax),
        description: z.string().trim().max(L.descriptionMax).optional(),
        identity: z.object({
            role: z.string().trim().min(1, { message: "Role is required." }).max(L.roleMax),
            targetAudience: z.string().trim().min(1, { message: "Audience is required." }).max(L.audienceMax),
            tone: z.enum(TONES),
            language: z.string().trim().min(2).max(35),
            customInstructions: z.string().trim().max(L.customInstructionsMax).optional(),
        }),
        research: z.object({
            topics: uniqueList(L.topicsMax).refine((t) => t.length > 0, { message: "Add at least one topic." }),
            keywords: uniqueList(L.keywordsMax),
            excludedTopics: uniqueList(L.excludedTopicsMax),
            feedUrls: z.array(httpsUrl).max(L.feedUrlsMax).transform((u) => Array.from(new Set(u))),
            freshnessHours: z.number().int().min(L.freshnessHoursMin).max(L.freshnessHoursMax),
            minSourceCount: z.number().int().min(L.minSourceCountMin).max(L.minSourceCountMax),
            // Let the research run use Gemini Google Search (metered). Older personas without it default to off.
            webSearch: z.boolean().default(false),
            // Run research automatically before each posting window. Off by default: it spends credits/AI without a click.
            autoRun: z.boolean().default(false),
        }),
        publishing: z.object({
            accountIds: z.array(z.enum(PLATFORMS)).min(1, { message: "Pick at least one platform." }).max(PLATFORMS.length),
            postsPerDay: z.number().int().min(L.postsPerDayMin).max(L.postsPerDayMax),
            timezone: z.string().refine(isValidTimeZone, { message: "Unknown time zone." }),
            postingWindows: z
                .array(postingWindow)
                .min(1, { message: "Add at least one posting window." })
                .max(L.postingWindowsMax)
                .refine((windows) => {
                    const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start));
                    return sorted.every((w, i) => i === 0 || sorted[i - 1].end <= w.start);
                }, { message: "Posting windows must not overlap." }),
            // "automatic" (opt-in auto-publish) can only be switched on through setPersonaApprovalMode, which asks for
            // confirmation; create/update ignore this field and keep the stored value.
            approvalMode: z.enum(APPROVAL_MODES).default("manual"),
            allowImages: z.boolean(),
        }),
        ai: z.object({
            connectionId: z.string().trim().max(128).optional(),
            modelProfile: z.enum(MODEL_PROFILES),
            monthlyCreditLimit: z.number().int().min(0).max(L.monthlyCreditLimitMax),
        }),
    })
    .strict()
    .refine((p) => !p.research.autoRun || p.research.feedUrls.length > 0 || p.research.webSearch, {
        message: "Add an RSS feed or turn on web search before enabling automatic research.",
        path: ["research", "autoRun"],
    });

export type PersonaInput = z.infer<typeof personaInputSchema>;

export const personaStatusSchema = z.enum(PERSONA_STATUSES);

export const personaIdSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

export const updatePersonaSchema = z.object({
    personaId: personaIdSchema,
    expectedVersion: z.number().int().min(1),
    persona: personaInputSchema,
}).strict();

export const setPersonaStatusSchema = z.object({
    personaId: personaIdSchema,
    status: personaStatusSchema,
}).strict();

export const deletePersonaSchema = z.object({ personaId: personaIdSchema }).strict();

export const setPersonaApprovalModeSchema = z.object({
    personaId: personaIdSchema,
    mode: z.enum(APPROVAL_MODES),
    // Required to turn auto-publish on: the user confirmed that posts will go out without review.
    acknowledge: z.boolean().optional(),
}).strict().refine((v) => v.mode === "manual" || v.acknowledge === true, { message: "Confirm that posts will be published without your review.", path: ["acknowledge"] });

export const setAutopilotEnabledSchema = z.object({ enabled: z.boolean() }).strict();
