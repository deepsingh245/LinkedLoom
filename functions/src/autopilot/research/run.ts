import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { consumeDailyQuota } from "../../ai-core/usage";
import { parse, requireUid } from "../../shared/callable";
import { personaIdSchema } from "../schema";
import { ensureWorkspace, personasRef, settingsRef, workspaceRef, writeAudit } from "../workspace";
import { executePipeline } from "./pipeline";
import { DAILY_RUNS, RESEARCH_LIMITS } from "./types";

const runLockRef = (workspaceId: string, personaId: string) => workspaceRef(workspaceId).collection("runLocks").doc(personaId);
const contentRef = (workspaceId: string) => workspaceRef(workspaceId).collection("contentItems");

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

const runSchema = z.object({ personaId: personaIdSchema }).strict();
const updateSchema = z.object({
    contentId: idSchema,
    text: z.string().trim().min(40, { message: "Post is too short." }).max(3000, { message: "Post is too long." }),
}).strict();
const statusSchema = z.object({ contentId: idSchema, status: z.enum(["pending", "rejected"]) }).strict();
const exportSchema = z.object({ contentId: idSchema }).strict();

/** One research run per persona at a time. The lease expires so a crashed run can't block forever. */
async function acquireLock(workspaceId: string, personaId: string, runId: string) {
    const ref = runLockRef(workspaceId, personaId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const lease = snap.data()?.leaseExpiresAt as Timestamp | undefined;
        if (snap.exists && lease && lease.toMillis() > Date.now()) {
            throw new HttpsError("failed-precondition", "A research run is already in progress for this persona.");
        }
        tx.set(ref, { runId, leaseExpiresAt: Timestamp.fromMillis(Date.now() + RESEARCH_LIMITS.runLeaseMs), startedAt: FieldValue.serverTimestamp() });
    });
}

async function extendLock(workspaceId: string, personaId: string, runId: string) {
    const ref = runLockRef(workspaceId, personaId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.data()?.runId !== runId) throw new HttpsError("aborted", "This run was superseded.");
        tx.update(ref, { leaseExpiresAt: Timestamp.fromMillis(Date.now() + RESEARCH_LIMITS.runLeaseMs) });
    });
}

async function releaseLock(workspaceId: string, personaId: string, runId: string) {
    const ref = runLockRef(workspaceId, personaId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.data()?.runId === runId) tx.delete(ref);
    }).catch(() => undefined);
}

/**
 * Run research for one persona now: discover → filter → fetch → extract → generate → verify → store.
 * Runs inside this call (≤ 9 minutes); the run document updates live so the UI can show progress.
 */
export const runResearch = onCall({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
    const uid = requireUid(request);
    const { personaId } = parse(runSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);

    const settings = (await settingsRef(workspaceId).get()).data();
    if (settings?.autopilotEnabled === false) throw new HttpsError("failed-precondition", "Autopilot is stopped. Turn it on to run research.");

    const personaSnap = await personasRef(workspaceId).doc(personaId).get();
    if (!personaSnap.exists) throw new HttpsError("not-found", "Persona not found.");
    const persona = personaSnap.data()!;
    if (persona.status === "archived") throw new HttpsError("failed-precondition", "Restore the persona first.");
    if (persona.status === "paused") throw new HttpsError("failed-precondition", "Resume the persona to run research.");
    if (!persona.research.feedUrls?.length && !persona.research.webSearch) {
        throw new HttpsError("failed-precondition", "Add at least one RSS feed or turn on web search for this persona.");
    }

    await consumeDailyQuota(workspaceId, "autopilot.run", DAILY_RUNS, `You've reached today's limit of ${DAILY_RUNS} research runs. Try again tomorrow.`);

    const runRef = workspaceRef(workspaceId).collection("workflowRuns").doc();
    await acquireLock(workspaceId, personaId, runRef.id);
    try {
        await runRef.set({
            id: runRef.id,
            personaId,
            personaName: persona.name,
            personaVersion: persona.version,
            trigger: "manual",
            status: "running",
            steps: [],
            stats: {},
            notes: [],
            rejections: [],
            createdBy: uid,
            startedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        const result = await executePipeline({
            workspaceId,
            uid,
            runId: runRef.id,
            runRef,
            personaId,
            persona,
            heartbeat: async () => {
                await extendLock(workspaceId, personaId, runRef.id);
                // Stop promptly if the user hits the kill switch or pauses the persona mid-run.
                const [s, p] = await Promise.all([settingsRef(workspaceId).get(), personasRef(workspaceId).doc(personaId).get()]);
                if (s.data()?.autopilotEnabled === false) throw new HttpsError("aborted", "Autopilot was stopped.");
                if (p.data()?.status !== "active") throw new HttpsError("aborted", "The persona was paused or archived.");
            },
        });

        await runRef.update({
            status: result.status,
            stats: result.stats,
            notes: result.notes,
            rejections: result.rejections,
            draftIds: result.draftIds,
            credits: result.stats.credits,
            finishedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        await writeAudit(workspaceId, uid, "research.run", personaId, { runId: runRef.id, status: result.status, drafts: result.draftIds.length });
        return { runId: runRef.id, status: result.status, drafts: result.draftIds.length, stats: result.stats, notes: result.notes };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Run failed.";
        await runRef.set({ status: "failed", notes: FieldValue.arrayUnion(message), finishedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => undefined);
        throw error;
    } finally {
        await releaseLock(workspaceId, personaId, runRef.id);
    }
});

/** Edit the LinkedIn text of a draft. */
export const updateContentItem = onCall(async (request) => {
    const uid = requireUid(request);
    const { contentId, text } = parse(updateSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = contentRef(workspaceId).doc(contentId);

    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "Draft not found.");
        tx.update(ref, {
            "variants.linkedin.text": text,
            "variants.linkedin.status": "draft",
            "edited": true,
            "version": FieldValue.increment(1),
            "updatedAt": FieldValue.serverTimestamp(),
        });
    });
    await writeAudit(workspaceId, uid, "content.update", contentId);
    return { id: contentId };
});

/** Reject a draft or put it back in the pending list. */
export const setContentStatus = onCall(async (request) => {
    const uid = requireUid(request);
    const { contentId, status } = parse(statusSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = contentRef(workspaceId).doc(contentId);

    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "Draft not found.");
        tx.update(ref, { approvalStatus: status, state: status === "rejected" ? "REJECTED" : "PENDING_APPROVAL", updatedAt: FieldValue.serverTimestamp() });
    });
    await writeAudit(workspaceId, uid, "content.status", contentId, { status });
    return { id: contentId, status };
});

/**
 * Copy a draft into the user's normal post drafts (`posts`, status DRAFT) so they can edit and
 * schedule it with the existing editor. Nothing is scheduled or published here. Idempotent.
 */
export const exportContentToDraft = onCall(async (request) => {
    const uid = requireUid(request);
    const { contentId } = parse(exportSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = contentRef(workspaceId).doc(contentId);

    const postId = await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "Draft not found.");
        const item = snap.data()!;
        if (item.exportedPostId) return item.exportedPostId as string;
        if (item.approvalStatus === "rejected") throw new HttpsError("failed-precondition", "Restore the draft before sending it to your drafts.");

        const text = item.variants?.linkedin?.text as string;
        const tags = ((item.hashtags as string[]) ?? []).map((h) => `#${h}`).join(" ");
        const id = `autopilot_${contentId}`;
        const postRef = getFirestore().collection("posts").doc(id);
        const now = new Date();
        tx.create(postRef, {
            user_id: uid,
            content: tags ? `${text}\n\n${tags}` : text,
            status: "DRAFT",
            tone: item.tone ?? "PROFESSIONAL",
            topic: item.topic ?? "",
            date: now.toISOString(),
            mediaUrls: [],
            imageUrl: null,
            linkedinUrn: "",
            versions: [],
            source: "autopilot",
            contentItemId: contentId,
            sourceUrls: ((item.sources as Array<{ url: string }>) ?? []).map((s) => s.url),
            createdAt: now,
            updatedAt: now,
        });
        tx.update(ref, { exportedPostId: id, updatedAt: FieldValue.serverTimestamp() });
        return id;
    });
    await writeAudit(workspaceId, uid, "content.export", contentId, { postId });
    return { id: contentId, postId };
});
