// Client-side shapes for research runs and drafts (mirrors functions/src/autopilot/research).

export type RunStatus = "running" | "completed" | "partial" | "failed";
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
  trigger: "manual";
  status: RunStatus;
  steps: RunStep[];
  stats: Partial<RunStats>;
  notes: string[];
  rejections: Rejection[];
  draftIds?: string[];
  credits?: number;
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
  qualityScore: number;
  approvalStatus: "pending" | "rejected";
  state: string;
  edited?: boolean;
  version: number;
  exportedPostId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RunResearchResult {
  runId: string;
  status: RunStatus;
  drafts: number;
  stats: RunStats;
  notes: string[];
}
