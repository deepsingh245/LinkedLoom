import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { Collections } from "./collections";
import { FirebaseFunctions } from "./functions";
import type { ContentItem, RunResearchResult, WorkflowRun } from "@/types/research";

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
  }) as ContentItem;

export const getContentItems = async (uid: string, max = 100): Promise<ContentItem[]> => {
  const snap = await getDocs(query(collection(db, Collections.WORKSPACES, uid, "contentItems"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => toContent(d.id, d.data()));
};

export const getRuns = async (uid: string, max = 30): Promise<WorkflowRun[]> => {
  const snap = await getDocs(query(collection(db, Collections.WORKSPACES, uid, "workflowRuns"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => toRun(d.id, d.data()));
};

/** Live view of a single run (steps tick in as the pipeline progresses). */
export const subscribeToRun = (uid: string, runId: string, onChange: (run: WorkflowRun) => void): Unsubscribe =>
  onSnapshot(doc(db, Collections.WORKSPACES, uid, "workflowRuns", runId), (snap) => {
    if (snap.exists()) onChange(toRun(snap.id, snap.data()));
  });

/** Newest run for a persona that is still running (used to show progress for a run started elsewhere). */
export const subscribeToLatestRun = (uid: string, onChange: (run: WorkflowRun | null) => void): Unsubscribe =>
  onSnapshot(
    query(collection(db, Collections.WORKSPACES, uid, "workflowRuns"), orderBy("createdAt", "desc"), limit(1)),
    (snap) => onChange(snap.empty ? null : toRun(snap.docs[0].id, snap.docs[0].data()))
  );

// Writes go through callable Cloud Functions.

export const runResearch = async (personaId: string) => {
  // The pipeline can take several minutes; give the call a longer timeout than the default.
  const call = httpsCallable<{ personaId: string }, RunResearchResult>(functions, FirebaseFunctions.RUN_RESEARCH, { timeout: 560_000 });
  return (await call({ personaId })).data;
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
