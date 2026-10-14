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
    runDeadlineMs: 480_000,
    dedupeWindowDays: 30,
    knownFingerprintLimit: 300,
} as const;

export const MAX_AI_CALLS_PER_RUN = Number(process.env.AUTOPILOT_RUN_MAX_AI_CALLS || 12);
export const DAILY_RUNS = Number(process.env.AUTOPILOT_DAILY_RUNS || 10);

export type StepName = "discover" | "filter" | "fetch" | "extract" | "generate" | "verify" | "store";
export type StepStatus = "running" | "done" | "skipped" | "failed";
export type RunStatus = "running" | "completed" | "partial" | "failed";

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
