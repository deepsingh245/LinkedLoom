import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { Collections } from "./collections";
import { FirebaseFunctions } from "./functions";
import type { ApprovalPreview, ApproveResult, ContentItem, PersonaDemoResult, PublishOutcome, RunResearchResult, WorkflowRun } from "@/types/research";

// Everything lives in the personal workspace (workspaces/{uid}); clients only read.

const toDate = (value: unknown): Date | undefined => {
  const v = value as { toDate?: () => Date } | Date | null | undefined;
  if (!v) return undefined;
  return typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate() : (v as Date);
};

const toRun = (id: string, data: DocumentData): WorkflowRun =>
  ({
    ...data,
    id,
    steps: data.steps ?? [],
    stats: data.stats ?? {},
    notes: data.notes ?? [],
    rejections: data.rejections ?? [],
    createdAt: toDate(data.createdAt),
    startedAt: toDate(data.startedAt),
    finishedAt: toDate(data.finishedAt),
  }) as WorkflowRun;

const toContent = (id: string, data: DocumentData): ContentItem =>
  ({
    ...data,
    id,
    hashtags: data.hashtags ?? [],
    sources: (data.sources ?? []).map((s: DocumentData) => ({ ...s, publishedAt: toDate(s.publishedAt) ?? null })),
    claims: data.claims ?? [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    scheduledFor: toDate(data.scheduledFor),
  }) as ContentItem;

export const getContentItems = async (uid: string, max = 100): Promise<ContentItem[]> => {
  const snap = await getDocs(query(collection(db, Collections.WORKSPACES, uid, "contentItems"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => toContent(d.id, d.data()));
};

export const getRuns = async (uid: string, max = 250): Promise<WorkflowRun[]> => {
  const snap = await getDocs(query(collection(db, Collections.WORKSPACES, uid, "workflowRuns"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => toRun(d.id, d.data()));
};

/** Live view of a single run (steps tick in as the pipeline progresses). */
export const subscribeToRun = (uid: string, runId: string, onChange: (run: WorkflowRun) => void, onError?: (error: Error) => void): Unsubscribe =>
  onSnapshot(doc(db, Collections.WORKSPACES, uid, "workflowRuns", runId), (snap) => {
    if (snap.exists()) onChange(toRun(snap.id, snap.data()));
  }, onError);

// Writes go through callable Cloud Functions.

export const runResearch = async (personaId: string) => {
  const call = httpsCallable<{ personaId: string }, RunResearchResult>(functions, FirebaseFunctions.RUN_RESEARCH);
  return (await call({ personaId })).data;
};

export const cancelRun = async (runId: string) => {
  const call = httpsCallable<{ runId: string }, { runId: string; status: string }>(functions, FirebaseFunctions.CANCEL_RUN);
  return (await call({ runId })).data;
};

export const retryRun = async (runId: string): Promise<RunResearchResult> => {
  const call = httpsCallable<{ runId: string }, RunResearchResult>(functions, FirebaseFunctions.RETRY_RUN);
  return (await call({ runId })).data;
};

export const updateContentItem = async (contentId: string, text: string) => {
  const call = httpsCallable<{ contentId: string; text: string }, { id: string }>(functions, FirebaseFunctions.UPDATE_CONTENT_ITEM);
  return (await call({ contentId, text })).data;
};

export const setContentStatus = async (contentId: string, status: "pending" | "rejected") => {
  const call = httpsCallable<{ contentId: string; status: string }, { id: string; status: string }>(functions, FirebaseFunctions.SET_CONTENT_STATUS);
  return (await call({ contentId, status })).data;
};

export const exportContentToDraft = async (contentId: string) => {
  const call = httpsCallable<{ contentId: string }, { id: string; postId: string }>(functions, FirebaseFunctions.EXPORT_CONTENT_TO_DRAFT);
  return (await call({ contentId })).data;
};

/** "Try a demo": writes sample drafts in the persona's voice straight into the approval queue (one AI call). */
export const runPersonaDemo = async (personaId: string) => {
  const call = httpsCallable<{ personaId: string }, PersonaDemoResult>(functions, FirebaseFunctions.RUN_PERSONA_DEMO, { timeout: 130_000 });
  return (await call({ personaId })).data;
};

// Approval & publishing (A5).

/** Suggested slot and readiness for "Approve & schedule". */
export const previewApproval = async (contentId: string) => {
  const call = httpsCallable<{ contentId: string }, ApprovalPreview>(functions, FirebaseFunctions.PREVIEW_APPROVAL);
  return (await call({ contentId })).data;
};

/** Approve a draft and schedule it on LinkedIn (next free slot, or `scheduledFor` ISO). Again = reschedule. */
export const approveContent = async (contentId: string, scheduledFor?: string) => {
  const call = httpsCallable<{ contentId: string; scheduledFor?: string }, ApproveResult>(functions, FirebaseFunctions.APPROVE_CONTENT);
  return (await call(scheduledFor ? { contentId, scheduledFor } : { contentId })).data;
};

export const unscheduleContent = async (contentId: string) => {
  const call = httpsCallable<{ contentId: string }, { id: string; status: "pending" }>(functions, FirebaseFunctions.UNSCHEDULE_CONTENT);
  return (await call({ contentId })).data;
};

/** Turn opt-in auto-publish on/off for a persona. Turning it on requires `acknowledge: true`. */
export const setPersonaApprovalMode = async (personaId: string, mode: "manual" | "automatic") => {
  const call = httpsCallable<{ personaId: string; mode: string; acknowledge?: boolean }, { id: string; approvalMode: string; version: number }>(
    functions,
    FirebaseFunctions.SET_PERSONA_APPROVAL_MODE
  );
  return (await call(mode === "automatic" ? { personaId, mode, acknowledge: true } : { personaId, mode })).data;
};

/** Answer a "needs check" post: it did go out (published), publish again (retry), or it didn't (failed). */
export const resolvePublishCheck = async (postId: string, outcome: "published" | "retry" | "failed") => {
  const call = httpsCallable<{ postId: string; outcome: string }, PublishOutcome>(functions, FirebaseFunctions.RESOLVE_PUBLISH_CHECK, { timeout: 130_000 });
  return (await call({ postId, outcome })).data;
};
