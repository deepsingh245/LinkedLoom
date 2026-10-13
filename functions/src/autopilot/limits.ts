// Single source of truth for persona limits (mirrored in lib/schemas/persona.ts on the client).
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
    postsPerDayMin: 1,
    postsPerDayMax: 10,
    postingWindowsMax: 5,
    freshnessHoursMin: 1,
    freshnessHoursMax: 168,
    minSourceCountMin: 1,
    minSourceCountMax: 5,
    monthlyCreditLimitMax: 100_000,
    personasPerWorkspace: 5,
} as const;

export const PLATFORMS = ["linkedin"] as const;
export const TONES = ["professional", "casual", "technical"] as const;
export const MODEL_PROFILES = ["economy", "balanced", "quality"] as const;
export const PERSONA_STATUSES = ["active", "paused", "archived"] as const;
