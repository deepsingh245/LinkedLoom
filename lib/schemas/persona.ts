import { z } from "zod";

// Mirrors functions/src/autopilot/schema.ts + limits.ts. The backend re-validates everything.
export const PERSONA_LIMITS = {
  nameMax: 60,
  descriptionMax: 300,
  roleMax: 120,
  audienceMax: 300,
  customInstructionsMax: 2000,
  tagMax: 60,
  topicsMax: 20,
  keywordsMax: 30,
  excludedTopicsMax: 20,
  feedUrlsMax: 20,
  postsPerDayMax: 10,
  postingWindowsMax: 5,
  freshnessHoursMax: 168,
  minSourceCountMax: 5,
  monthlyCreditLimitMax: 100_000,
  personasPerWorkspace: 5,
} as const;

const L = PERSONA_LIMITS;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const tags = (max: number, label: string) =>
  z.array(z.string().trim().min(1).max(L.tagMax)).max(max, { message: `Up to ${max} ${label}.` });

export const personaFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required." }).max(L.nameMax),
  description: z.string().trim().max(L.descriptionMax).optional(),
  identity: z.object({
    role: z.string().trim().min(1, { message: "Role is required." }).max(L.roleMax),
    targetAudience: z.string().trim().min(1, { message: "Audience is required." }).max(L.audienceMax),
    tone: z.enum(["professional", "casual", "technical"]),
    language: z.string().trim().min(2, { message: "Language is required." }).max(35),
    customInstructions: z.string().trim().max(L.customInstructionsMax).optional(),
  }),
  research: z.object({
    topics: tags(L.topicsMax, "topics").min(1, { message: "Add at least one topic." }),
    keywords: tags(L.keywordsMax, "keywords"),
    excludedTopics: tags(L.excludedTopicsMax, "excluded topics"),
    feedUrls: z
      .array(z.string().trim().refine(isHttpsUrl, { message: "Feed URLs must start with https://" }))
      .max(L.feedUrlsMax, { message: `Up to ${L.feedUrlsMax} feeds.` }),
    freshnessHours: z.number().int().min(1).max(L.freshnessHoursMax),
    minSourceCount: z.number().int().min(1).max(L.minSourceCountMax),
  }),
  publishing: z.object({
    accountIds: z.array(z.enum(["linkedin"])).min(1, { message: "Pick at least one platform." }),
    postsPerDay: z.number().int().min(1).max(L.postsPerDayMax),
    timezone: z.string().refine(isValidTimeZone, { message: "Unknown time zone." }),
    postingWindows: z
      .array(
        z
          .object({
            start: z.string().regex(TIME_RE, { message: "Use HH:mm." }),
            end: z.string().regex(TIME_RE, { message: "Use HH:mm." }),
          })
          .refine((w) => w.start < w.end, { message: "Start must be before end.", path: ["end"] })
      )
      .min(1, { message: "Add at least one posting window." })
      .max(L.postingWindowsMax)
      .refine(
        (windows) => {
          const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start));
          return sorted.every((w, i) => i === 0 || sorted[i - 1].end <= w.start);
        },
        { message: "Posting windows must not overlap." }
      ),
    approvalMode: z.literal("manual"),
    allowImages: z.boolean(),
  }),
  ai: z.object({
    modelProfile: z.enum(["economy", "balanced", "quality"]),
    monthlyCreditLimit: z.number().int().min(0).max(L.monthlyCreditLimitMax),
  }),
});

export type PersonaFormValues = z.infer<typeof personaFormSchema>;
