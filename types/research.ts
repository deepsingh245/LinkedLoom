// Client-side shapes for research runs and drafts (mirrors functions/src/autopilot/research).

export type RunStatus = "queued" | "running" | "completed" | "partial" | "failed" | "cancelled" | "skipped";
export type RunTrigger = "manual" | "scheduled" | "retry";
export type StepName = "discover" | "filter" | "fetch" | "extract" | "generate" | "verify" | "store";
export type StepStatus = "running" | "done" | "skipped" | "failed";

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

export interface Rejection {
  topic: string;
  reasons: string[];
}

export interface WorkflowRun {
  id: string;
  personaId: string;
  personaName?: string;
  personaVersion: number;
  trigger: RunTrigger;
  retryOf?: string;
  reason?: string;
  currentStep?: StepName;
  cancelRequested?: boolean;
  status: RunStatus;
  steps: RunStep[];
  stats: Partial<RunStats>;
  notes: string[];
  rejections: Rejection[];
  draftIds?: string[];
  credits?: number;
  createdAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface ContentSource {
  url: string;
  title: string;
  domain: string;
  publishedAt?: Date | null;
  quote: string;
}

export interface ContentClaim {
  claim: string;
  quote: string;
  sourceUrl: string;
}

export type ContentApprovalStatus = "pending" | "rejected" | "approved";
export type ContentState = "PENDING_APPROVAL" | "REJECTED" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "MISSED" | "FAILED" | "RECONCILIATION_REQUIRED";

export interface ContentItem {
  id: string;
  personaId: string;
  runId: string;
  topic: string;
  masterDraft: string;
  hashtags: string[];
  variants: { linkedin: { text: string; status: string } };
  sources: ContentSource[];
  claims: ContentClaim[];
  /** null for demo drafts (not researched or fact-checked). */
  qualityScore: number | null;
  /** Sample draft from "Try a demo": shows the review flow, not based on research. */
  demo?: boolean;
  approvalStatus: ContentApprovalStatus;
  /** Mirrors the scheduled post: PENDING_APPROVAL | REJECTED | SCHEDULED | PUBLISHING | PUBLISHED | FAILED | RECONCILIATION_REQUIRED. */
  state: ContentState | string;
  /** Set once approved (A5): the post in `posts` that will be / was published. */
  scheduledPostId?: string;
  scheduledFor?: Date;
  approvedBy?: "user" | "autopilot";
  publishedUrl?: string;
  publishError?: string;
  edited?: boolean;
  version: number;
  exportedPostId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RunResearchResult {
  runId: string;
  status: "queued";
}

export interface ApprovalPreview {
  /** Next free posting slot (ISO), or null when none is free in the next 14 days. */
  suggestedAt: string | null;
  window: { start: string; end: string } | null;
  timezone: string;
  linkedinConnected: boolean;
  linkedinExpired: boolean;
  autopilotEnabled: boolean;
  currentScheduledFor: string | null;
  /** Why the draft can't be scheduled right now (null when it can). */
  blocker: string | null;
}

export interface ApproveResult {
  id: string;
  postId: string;
  scheduledFor: string;
  rescheduled: boolean;
}

export interface PublishOutcome {
  postId: string;
  status: string;
  reason?: string;
  publishedUrl?: string;
  error?: string;
}

export interface PersonaDemoResult {
  draftIds: string[];
  drafts: Array<{ angle: string; post: string; hashtags: string[] }>;
  provider: "gemini" | "openai";
  model: string;
  billingMode: "managed" | "byok";
  credits: number;
}

/** Company context file (.md / .txt) the author uploaded; the full text stays on the server. */
export interface ContextDoc {
  id: string;
  name: string;
  kind: "md" | "txt";
  /** Characters. */
  size: number;
  preview: string;
  /** null = used by every persona. */
  personaId: string | null;
  enabled: boolean;
  createdAt?: Date;
}
