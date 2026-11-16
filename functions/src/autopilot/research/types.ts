import type { Timestamp } from "firebase-admin/firestore";

export const RESEARCH_LIMITS = {
    maxFeedItemsPerFeed: 30,
    maxSearchTopics: 2,
    maxCandidatesToFetch: 8,
    fetchConcurrency: 4,
    maxDraftsPerRun: 3,
    extractCharsPerArticle: 3000,
    evidenceQuoteMax: 300,
    runLeaseMs: 10 * 60 * 1000,
    runDeadlineMs: 30 * 60 * 1000,
    dedupeWindowDays: 30,
    knownFingerprintLimit: 300,
} as const;

/** Env number that honours an explicit 0 (unlike `|| default`). */
export const envNum = (name: string, fallback: number): number => {
    const raw = process.env[name];
    const value = raw === undefined || raw === "" ? NaN : Number(raw);
    return Number.isFinite(value) ? value : fallback;
};

export const MAX_AI_CALLS_PER_RUN = envNum("AUTOPILOT_RUN_MAX_AI_CALLS", 12);
export const DAILY_RUNS = envNum("AUTOPILOT_DAILY_RUNS", 10);

export type StepName = "discover" | "filter" | "fetch" | "extract" | "generate" | "verify" | "store";
export type StepStatus = "running" | "done" | "skipped" | "failed";
export type RunStatus = "queued" | "running" | "completed" | "partial" | "failed" | "cancelled" | "skipped";
export type RunTrigger = "manual" | "scheduled" | "retry";
export const TERMINAL_STATUSES: RunStatus[] = ["completed", "partial", "failed", "cancelled", "skipped"];

export interface RunStep {
    name: StepName;
    status: StepStatus;
    startedAt: number;
    finishedAt?: number;
    note?: string;
}

export interface RunStats {
    feedsFetched: number;
    feedsFailed: number;
    candidates: number;
    afterFilter: number;
    duplicates: number;
    fetched: number;
    fetchFailed: number;
    thinPages: number;
    claims: number;
    draftsGenerated: number;
    draftsAccepted: number;
    draftsRejected: number;
    aiCalls: number;
    credits: number;
}

export const emptyStats = (): RunStats => ({
    feedsFetched: 0,
    feedsFailed: 0,
    candidates: 0,
    afterFilter: 0,
    duplicates: 0,
    fetched: 0,
    fetchFailed: 0,
    thinPages: 0,
    claims: 0,
    draftsGenerated: 0,
    draftsAccepted: 0,
    draftsRejected: 0,
    aiCalls: 0,
    credits: 0,
});

export interface Rejection {
    topic: string;
    reasons: string[];
}

export interface ContentSource {
    url: string;
    title: string;
    domain: string;
    publishedAt?: Timestamp | Date | null;
    quote: string;
}

export interface ContentClaim {
    claim: string;
    quote: string;
    sourceUrl: string;
}

export type ContentApprovalStatus = "pending" | "rejected";

// ---- Durable workflow settings (env-tunable) ----
export const STEP_ORDER: StepName[] = ["discover", "filter", "fetch", "extract", "generate", "verify", "store"];
export const nextStepOf = (step: StepName): StepName | null => STEP_ORDER[STEP_ORDER.indexOf(step) + 1] ?? null;

export const MAX_PENDING_DRAFTS = envNum("AUTOPILOT_MAX_PENDING_DRAFTS", 6);
export const MIN_CREDITS_TO_RUN = envNum("AUTOPILOT_MIN_CREDITS_TO_RUN", 20);
/** A scheduled run that is overdue by more than this is skipped (its posting window has passed). */
export const MAX_SCHEDULE_LATENESS_MS = envNum("AUTOPILOT_MAX_SCHEDULE_LATENESS_MINUTES", 240) * 60_000;
/** A run with no progress for this long is considered stuck (a task was lost). */
export const STUCK_AFTER_MS = envNum("AUTOPILOT_STUCK_AFTER_MINUTES", 20) * 60_000;
export const MAX_REAPER_RETRIES = 2;
export const STEP_MAX_ATTEMPTS = 3;