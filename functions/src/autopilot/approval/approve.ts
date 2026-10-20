import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { z } from "zod";
import { parse, requireUid } from "../../shared/callable";
import { isExpired } from "../../publishing/errors";
import { normalizeStatus } from "../../publishing/publish-post";
import { POST_STATUS } from "../../publishing/types";
import { ensureWorkspace, personasRef, settingsRef, workspaceRef, writeAudit } from "../workspace";
import { nextFreeSlot, type FreeSlot, type OccupiedSlot } from "./slots";

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const contentSchema = z.object({ contentId: idSchema }).strict();
const approveSchema = z.object({
    contentId: idSchema,
    // Optional exact time (ISO 8601). Without it, the persona's next free posting slot is used.
    scheduledFor: z.string().datetime({ offset: true }).optional(),
}).strict();

const MIN_LEAD_MS = 2 * 60_000;
const MAX_AHEAD_MS = 60 * 86_400_000;

/** Posts that hold a slot (already scheduled, being published or out). */
const SLOT_HOLDING: string[] = [POST_STATUS.SCHEDULED, POST_STATUS.RETRY_PENDING, POST_STATUS.PUBLISHING, POST_STATUS.PUBLISHED];
/** Post statuses that can still be (re)scheduled or unscheduled. */
const RESCHEDULABLE: string[] = [POST_STATUS.DRAFT, POST_STATUS.SCHEDULED, POST_STATUS.RETRY_PENDING, POST_STATUS.MISSED, POST_STATUS.FAILED];

export const autopilotPostId = (contentId: string) => `autopilot_${contentId}`;
const contentRef = (workspaceId: string, contentId: string) => workspaceRef(workspaceId).collection("contentItems").doc(contentId);
const postRef = (contentId: string) => getFirestore().collection("posts").doc(autopilotPostId(contentId));

/** LinkedIn connection that can publish (exists, has a token, not expired). */
export async function linkedinStatus(uid: string): Promise<{ connected: boolean; expired: boolean }> {
    const snap = await getFirestore().collection("users").doc(uid).collection("connections").doc("linkedin").get();
    const data = snap.data();
    if (!snap.exists || !data?.accessToken) return { connected: false, expired: false };
    return { connected: true, expired: isExpired(data.expiresAt) };
}

async function occupiedSlots(uid: string, now: Date, excludePostId: string): Promise<OccupiedSlot[]> {
    // Uses the existing (user_id, scheduledFor) index; status is filtered here.
    const snap = await getFirestore().collection("posts")
        .where("user_id", "==", uid)
        .where("scheduledFor", ">=", Timestamp.fromMillis(now.getTime() - 86_400_000))
        .limit(500)
        .get();
    return snap.docs
        .filter((d) => d.id !== excludePostId && SLOT_HOLDING.includes(normalizeStatus(d.data().status)))
        .map((d) => {
            const at = d.data().scheduledFor;
            return { at: typeof at?.toDate === "function" ? at.toDate() : new Date(at), personaId: d.data().personaId as string | undefined };
        })
        .filter((o) => !Number.isNaN(o.at.getTime()));
}

function scheduleInput(persona: DocumentData) {
    return {
        timezone: String(persona.publishing?.timezone ?? "UTC"),
        postsPerDay: Number(persona.publishing?.postsPerDay ?? 1),
        postingWindows: (persona.publishing?.postingWindows ?? []) as Array<{ start: string; end: string }>,
    };
}

/** Shared checks for approving: kill switch, LinkedIn, draft and persona state. */
async function loadForApproval(workspaceId: string, uid: string, contentId: string) {
    const [settings, linkedin, contentSnap] = await Promise.all([
        settingsRef(workspaceId).get(),
        linkedinStatus(uid),
        contentRef(workspaceId, contentId).get(),
    ]);
    if (!contentSnap.exists) throw new HttpsError("not-found", "Draft not found.");
    const item = contentSnap.data()!;
    const personaSnap = await personasRef(workspaceId).doc(String(item.personaId)).get();
    return { autopilotEnabled: settings.data()?.autopilotEnabled !== false, linkedin, item, persona: personaSnap.exists ? personaSnap.data()! : null };
}

function assertApprovable(ctx: Awaited<ReturnType<typeof loadForApproval>>) {
    const { autopilotEnabled, linkedin, item, persona } = ctx;
    if (!autopilotEnabled) throw new HttpsError("failed-precondition", "Autopilot is stopped. Turn it on to schedule posts.");
    if (item.demo) throw new HttpsError("failed-precondition", "Demo drafts can't be published. Run research to get real, sourced drafts.");
    if (item.approvalStatus === "rejected") throw new HttpsError("failed-precondition", "Restore the draft before scheduling it.");
    const state = String(item.state ?? "");
    if (["PUBLISHING", "PUBLISHED", "RECONCILIATION_REQUIRED"].includes(state)) {
        throw new HttpsError("failed-precondition", state === "PUBLISHED" ? "This draft is already published." : "This draft is being published or needs your check first.");
    }
    if (!persona || persona.status === "archived") throw new HttpsError("failed-precondition", "This draft's persona is archived or deleted.");
    if (!linkedin.connected) throw new HttpsError("failed-precondition", "Connect LinkedIn in Settings before scheduling posts.");
    if (linkedin.expired) throw new HttpsError("failed-precondition", "Your LinkedIn connection expired. Reconnect LinkedIn in Settings.");
}

export interface ApproveResult {
    postId: string;
    scheduledFor: Date;
    rescheduled: boolean;
}

/**
 * Approve a draft and schedule it on LinkedIn: creates/updates posts/autopilot_<contentId> (status SCHEDULED)
 * and marks the content item approved. Without `scheduledFor` it takes the persona's next free slot.
 * Re-approving a scheduled draft reschedules it. Used by the callable and by opt-in auto-publish.
 */
export async function approveContentInternal(params: {
    workspaceId: string;
    uid: string;
    contentId: string;
    scheduledFor?: Date;
    auto?: boolean;
    now?: Date;
}): Promise<ApproveResult> {
    const { workspaceId, uid, contentId } = params;
    const now = params.now ?? new Date();
    const ctx = await loadForApproval(workspaceId, uid, contentId);
    assertApprovable(ctx);
    const persona = ctx.persona!;
    if (params.auto && (persona.status !== "active" || persona.publishing?.approvalMode !== "automatic")) {
        throw new HttpsError("failed-precondition", "Auto-publish is off for this persona.");
    }

    let at: Date;
    if (params.scheduledFor) {
        at = params.scheduledFor;
        if (at.getTime() < now.getTime() + MIN_LEAD_MS) throw new HttpsError("invalid-argument", "Pick a time at least 2 minutes from now.");
        if (at.getTime() > now.getTime() + MAX_AHEAD_MS) throw new HttpsError("invalid-argument", "You can schedule up to 60 days ahead.");
    } else {
        const slot = nextFreeSlot(scheduleInput(persona), await occupiedSlots(uid, now, autopilotPostId(contentId)), { now, personaId: String(ctx.item.personaId) });
        if (!slot) throw new HttpsError("failed-precondition", "No free posting slot in the next 14 days. Pick a time instead.");
        at = slot.at;
    }

    const cRef = contentRef(workspaceId, contentId);
    const pRef = postRef(contentId);
    const rescheduled = await getFirestore().runTransaction(async (tx) => {
        const [cSnap, pSnap] = await Promise.all([tx.get(cRef), tx.get(pRef)]);
        if (!cSnap.exists) throw new HttpsError("not-found", "Draft not found.");
        const item = cSnap.data()!;
        if (item.approvalStatus === "rejected" || item.demo) throw new HttpsError("failed-precondition", "This draft can't be scheduled.");
        const existing = pSnap.exists ? pSnap.data()! : null;
        if (existing && existing.user_id !== uid) throw new HttpsError("permission-denied", "Post belongs to someone else.");
        if (existing && !RESCHEDULABLE.includes(normalizeStatus(existing.status))) {
            throw new HttpsError("failed-precondition", "This post is being published or needs your check first.");
        }

        const text = String(item.variants?.linkedin?.text ?? "");
        const tags = ((item.hashtags as string[]) ?? []).map((h) => `#${h}`).join(" ");
        const ts = Timestamp.fromDate(at);
        const post: Record<string, unknown> = {
            user_id: uid,
            workspaceId,
            content: tags ? `${text}\n\n${tags}` : text,
            status: POST_STATUS.SCHEDULED,
            scheduledFor: ts,
            platforms: ["linkedin"],
            source: "autopilot",
            contentItemId: contentId,
            personaId: item.personaId,
            approvedBy: params.auto ? "autopilot" : "user",
            tone: item.tone ?? "PROFESSIONAL",
            topic: item.topic ?? "",
            sourceUrls: ((item.sources as Array<{ url: string }>) ?? []).map((s) => s.url),
            attempts: 0,
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (existing) {
            // An exported draft (or a failed post) becomes the scheduled post; clear old publish results.
            tx.update(pRef, { ...post, results: FieldValue.delete(), error: FieldValue.delete(), nextAttemptAt: FieldValue.delete() });
        } else {
            tx.create(pRef, { ...post, results: {}, date: now.toISOString(), mediaUrls: [], imageUrl: null, linkedinUrn: "", versions: [], createdAt: FieldValue.serverTimestamp() });
        }
        tx.update(cRef, {
            approvalStatus: "approved",
            state: "SCHEDULED",
            scheduledPostId: pRef.id,
            exportedPostId: pRef.id,
            scheduledFor: ts,
            approvedAt: FieldValue.serverTimestamp(),
            approvedBy: params.auto ? "autopilot" : "user",
            publishError: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return !!existing && normalizeStatus(existing.status) !== POST_STATUS.DRAFT;
    });

    await writeAudit(workspaceId, uid, "content.approve", contentId, { postId: pRef.id, scheduledFor: at.toISOString(), auto: !!params.auto, rescheduled });
    return { postId: pRef.id, scheduledFor: at, rescheduled };
}

/** Suggested slot + readiness for the "Approve & schedule" dialog. Read-only. */
export const previewApproval = onCall(async (request) => {
    const uid = requireUid(request);
    const { contentId } = parse(contentSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ctx = await loadForApproval(workspaceId, uid, contentId);
    const now = new Date();

    let slot: FreeSlot | null = null;
    if (ctx.persona) {
        slot = nextFreeSlot(scheduleInput(ctx.persona), await occupiedSlots(uid, now, autopilotPostId(contentId)), { now, personaId: String(ctx.item.personaId) });
    }
    let blocker: string | null = null;
    try {
        assertApprovable(ctx);
    } catch (error) {
        blocker = error instanceof HttpsError ? error.message : "This draft can't be scheduled.";
    }
    const current = ctx.item.scheduledFor;
    return {
        suggestedAt: slot ? slot.at.toISOString() : null,
        window: slot?.window ?? null,
        timezone: ctx.persona ? scheduleInput(ctx.persona).timezone : "UTC",
        linkedinConnected: ctx.linkedin.connected && !ctx.linkedin.expired,
        linkedinExpired: ctx.linkedin.expired,
        autopilotEnabled: ctx.autopilotEnabled,
        currentScheduledFor: typeof current?.toDate === "function" ? current.toDate().toISOString() : null,
        blocker,
    };
});

/** Approve a draft and schedule it (next free slot, or `scheduledFor`). Calling it again reschedules. */
export const approveContent = onCall(async (request) => {
    const uid = requireUid(request);
    const { contentId, scheduledFor } = parse(approveSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const result = await approveContentInternal({ workspaceId, uid, contentId, scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined });
    return { id: contentId, postId: result.postId, scheduledFor: result.scheduledFor.toISOString(), rescheduled: result.rescheduled };
});

/** Take an approved draft off the schedule: the post becomes a normal draft again and the item goes back to review. */
export const unscheduleContent = onCall(async (request) => {
    const uid = requireUid(request);
    const { contentId } = parse(contentSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const cRef = contentRef(workspaceId, contentId);
    const pRef = postRef(contentId);

    await getFirestore().runTransaction(async (tx) => {
        const [cSnap, pSnap] = await Promise.all([tx.get(cRef), tx.get(pRef)]);
        if (!cSnap.exists) throw new HttpsError("not-found", "Draft not found.");
        if (pSnap.exists) {
            const post = pSnap.data()!;
            if (post.user_id !== uid) throw new HttpsError("permission-denied", "Post belongs to someone else.");
            const status = normalizeStatus(post.status);
            if (![POST_STATUS.SCHEDULED, POST_STATUS.RETRY_PENDING, POST_STATUS.MISSED, POST_STATUS.FAILED, POST_STATUS.DRAFT].includes(status as never)) {
                throw new HttpsError("failed-precondition", status === POST_STATUS.PUBLISHED ? "This post is already published." : "This post is being published right now.");
            }
            tx.update(pRef, { status: POST_STATUS.DRAFT, scheduledFor: null, nextAttemptAt: FieldValue.delete(), error: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
        }
        tx.update(cRef, {
            approvalStatus: "pending",
            state: "PENDING_APPROVAL",
            scheduledFor: FieldValue.delete(),
            scheduledPostId: FieldValue.delete(),
            publishError: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    });
    await writeAudit(workspaceId, uid, "content.unschedule", contentId);
    return { id: contentId, status: "pending" as const };
});
