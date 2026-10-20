import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { consumeDailyQuota } from "../../ai-core/usage";
import { parse, requireUid } from "../../shared/callable";
import { personaIdSchema } from "../schema";
import { ensureWorkspace, personasRef, settingsRef, workspaceRef, writeAudit } from "../workspace";
import { startRun } from "./start";
import { finalizeRun, runRefOf } from "./steps";
import { DAILY_RUNS, TERMINAL_STATUSES } from "./types";

const contentRef = (workspaceId: string) => workspaceRef(workspaceId).collection("contentItems");

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

const runSchema = z.object({ personaId: personaIdSchema }).strict();
const runIdSchema = z.object({ runId: idSchema }).strict();
const updateSchema = z.object({
    contentId: idSchema,
    text: z.string().trim().min(40, { message: "Post is too short." }).max(3000, { message: "Post is too long." }),
}).strict();
const statusSchema = z.object({ contentId: idSchema, status: z.enum(["pending", "rejected"]) }).strict();
const exportSchema = z.object({ contentId: idSchema }).strict();

/** Checks shared by a manual run and a retry. Throws readable errors. */
async function assertCanRun(workspaceId: string, personaId: string) {
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
    return persona;
}

/**
 * Start a research run now. The run is queued and executed step by step in the background
 * (Cloud Tasks); this returns immediately and the run document updates live.
 */
export const runResearch = onCall(async (request) => {
    const uid = requireUid(request);
    const { personaId } = parse(runSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const persona = await assertCanRun(workspaceId, personaId);

    const runId = await startRun({ workspaceId, uid, personaId, persona, trigger: "manual" });
    return { runId, status: "queued" as const };
});

/** Run again after a failed, partial, skipped or cancelled run. */
export const retryRun = onCall(async (request) => {
    const uid = requireUid(request);
    const { runId } = parse(runIdSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);

    const prior = await runRefOf(workspaceId, runId).get();
    if (!prior.exists) throw new HttpsError("not-found", "Run not found.");
    const priorData = prior.data()!;
    if (!TERMINAL_STATUSES.includes(priorData.status) || priorData.status === "completed") {
        throw new HttpsError("failed-precondition", "Only failed, stopped, skipped or cancelled runs can be run again.");
    }

    const persona = await assertCanRun(workspaceId, priorData.personaId);
    const newRunId = await startRun({ workspaceId, uid, personaId: priorData.personaId, persona, trigger: "retry", retryOf: runId });
    await writeAudit(workspaceId, uid, "run.retry", priorData.personaId, { runId: newRunId, retryOf: runId });
    return { runId: newRunId, status: "queued" as const };
});

/** Stop a queued or running research run. The worker stops at its next step; a queued run stops immediately. */
export const cancelRun = onCall(async (request) => {
    const uid = requireUid(request);
    const { runId } = parse(runIdSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = runRefOf(workspaceId, runId);

    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Run not found.");
    const run = snap.data()!;
    if (TERMINAL_STATUSES.includes(run.status)) return { runId, status: run.status as string };

    await ref.update({ cancelRequested: true, updatedAt: FieldValue.serverTimestamp() });
    await writeAudit(workspaceId, uid, "run.cancel", run.personaId, { runId });

    // Nothing has started yet: no worker will notice, so end it here.
    if (run.status === "queued" && !(run.steps as unknown[] | undefined)?.length) {
        await finalizeRun(workspaceId, runId, "cancelled", { personaId: run.personaId, reason: "Cancelled by you.", note: "Cancelled by you.", uid });
        return { runId, status: "cancelled" };
    }
    return { runId, status: "cancelling" };
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
        const item = snap.data()!;
        // A scheduled draft: keep the scheduled post's text in sync (only while it hasn't started publishing).
        if (item.approvalStatus === "approved") {
            const postRef = getFirestore().collection("posts").doc(String(item.scheduledPostId ?? `autopilot_${contentId}`));
            const post = await tx.get(postRef);
            const status = String(post.data()?.status ?? "").toUpperCase();
            if (post.exists && !["SCHEDULED", "RETRY_PENDING", "DRAFT"].includes(status)) {
                throw new HttpsError("failed-precondition", "This post is already being published, so it can't be edited here.");
            }
            if (post.exists) {
                const tags = ((item.hashtags as string[]) ?? []).map((h) => `#${h}`).join(" ");
                tx.update(postRef, { content: tags ? `${text}\n\n${tags}` : text, updatedAt: FieldValue.serverTimestamp() });
            }
        }
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
        if (snap.data()!.approvalStatus === "approved") {
            throw new HttpsError("failed-precondition", "This draft is scheduled. Unschedule it first.");
        }
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
