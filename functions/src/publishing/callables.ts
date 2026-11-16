import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { parse, requireUid } from "../shared/callable";
import { writeAudit } from "../autopilot/workspace";
import { mirrorToContent, normalizeStatus, postsRef, publishPost, republishPostCore } from "./publish-post";
import { POST_STATUS, PUBLISH_PLATFORMS } from "./types";

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const httpsUrl = z.string().trim().max(2048).refine((v) => {
    try {
        return new URL(v).protocol === "https:";
    } catch {
        return false;
    }
}, { message: "Use an https:// URL." });

// A base64 image is stored on the post; keep the document well under Firestore's 1 MiB limit.
const imageSchema = z.string().max(700_000).refine((v) => v.startsWith("data:image/") || httpsUrl.safeParse(v).success, { message: "Unsupported image." });

const publishNowSchema = z.object({
    postId: idSchema.optional(),
    content: z.string().trim().min(1).max(3000).optional(),
    platforms: z.array(z.enum(PUBLISH_PLATFORMS)).min(1, { message: "Pick at least one platform." }).max(PUBLISH_PLATFORMS.length).optional(),
    articleUrl: httpsUrl.optional(),
    imageUrl: imageSchema.optional(),
    subreddit: z.string().trim().max(100).optional(),
}).strict().refine((v) => v.postId || v.content, { message: "Write something to publish." });

const republishSchema = z.object({
    postId: idSchema,
    platform: z.enum(PUBLISH_PLATFORMS).default("linkedin"),
}).strict();

const resolveSchema = z.object({
    postId: idSchema,
    outcome: z.enum(["published", "retry", "failed"]),
    postUrl: httpsUrl.optional(),
}).strict();

/** Statuses from which a user may publish a post right away. */
const PUBLISHABLE_NOW: string[] = [POST_STATUS.DRAFT, POST_STATUS.SCHEDULED, POST_STATUS.RETRY_PENDING, POST_STATUS.MISSED, POST_STATUS.FAILED, POST_STATUS.PARTIAL];

/**
 * Publish now, through the same claim/lease path as the scheduler (no double posting, results saved
 * per platform). Either publishes an existing post (`postId`) or creates one from `content`.
 * Replaces the old client-side flow that called the platform endpoints and then wrote PUBLISHED itself.
 */
export const publishNow = onCall({ timeoutSeconds: 120 }, async (request) => {
    const uid = requireUid(request);
    const input = parse(publishNowSchema, request.data);
    const db = getFirestore();
    const now = new Date();

    const ref = input.postId ? postsRef().doc(input.postId) : postsRef().doc();
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const patch: Record<string, unknown> = {
            status: POST_STATUS.SCHEDULED,
            scheduledFor: Timestamp.fromDate(now),
            updatedAt: FieldValue.serverTimestamp(),
            error: FieldValue.delete(),
            nextAttemptAt: FieldValue.delete(),
        };
        if (input.content) patch.content = input.content;
        if (input.platforms) patch.platforms = input.platforms;
        if (input.articleUrl !== undefined) patch.articleUrl = input.articleUrl;
        if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
        if (input.subreddit !== undefined) patch.subreddit = input.subreddit;

        if (input.postId) {
            if (!snap.exists || snap.data()!.user_id !== uid) throw new HttpsError("not-found", "Post not found.");
            const status = normalizeStatus(snap.data()!.status);
            if (!PUBLISHABLE_NOW.includes(status)) {
                throw new HttpsError("failed-precondition", status === POST_STATUS.PUBLISHED ? "This post is already published." : "This post is being published or needs your check first.");
            }
            tx.update(ref, patch);
        } else {
            tx.create(ref, {
                user_id: uid,
                content: input.content,
                platforms: input.platforms ?? ["linkedin"],
                articleUrl: input.articleUrl ?? null,
                imageUrl: input.imageUrl ?? null,
                subreddit: input.subreddit ?? null,
                mediaUrls: [],
                linkedinUrn: "",
                versions: [],
                source: "manual",
                date: now.toISOString(),
                ...patch,
                error: null,
                nextAttemptAt: null,
                createdAt: FieldValue.serverTimestamp(),
            });
        }
    });

    const outcome = await publishPost(ref.id, {}, { force: true });
    if (outcome.status === "skipped") throw new HttpsError("aborted", "This post is already being published. Refresh in a moment.");
    return outcome;
});

/**
 * Answer a RECONCILIATION_REQUIRED post (we couldn't tell whether it went out):
 *  - published: the user saw it on their feed → mark PUBLISHED,
 *  - retry: it isn't there → publish again now,
 *  - failed: leave it unpublished.
 */
export const resolvePublishCheck = onCall({ timeoutSeconds: 120 }, async (request) => {
    const uid = requireUid(request);
    const { postId, outcome, postUrl } = parse(resolveSchema, request.data);
    const ref = postsRef().doc(postId);

    const post = await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data()!.user_id !== uid) throw new HttpsError("not-found", "Post not found.");
        const data = snap.data()!;
        if (normalizeStatus(data.status) !== POST_STATUS.RECONCILIATION_REQUIRED) {
            throw new HttpsError("failed-precondition", "This post doesn't need a check any more.");
        }
        const results = { ...(data.results ?? {}) } as Record<string, { status: string }>;
        const unknown = Object.keys(results).filter((p) => results[p]?.status !== "published");

        if (outcome === "published") {
            const patch: Record<string, unknown> = {
                status: POST_STATUS.PUBLISHED,
                publishedAt: FieldValue.serverTimestamp(),
                error: FieldValue.delete(),
                resolvedBy: "user",
                updatedAt: FieldValue.serverTimestamp(),
            };
            for (const p of unknown) patch[`results.${p}.status`] = "published";
            if (postUrl) patch.publishedUrl = postUrl;
            tx.update(ref, patch);
        } else if (outcome === "retry") {
            const patch: Record<string, unknown> = {
                status: POST_STATUS.SCHEDULED,
                scheduledFor: Timestamp.now(),
                error: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            for (const p of unknown) patch[`results.${p}`] = FieldValue.delete();
            tx.update(ref, patch);
        } else {
            tx.update(ref, { status: POST_STATUS.FAILED, error: "You marked this post as not published.", resolvedBy: "user", updatedAt: FieldValue.serverTimestamp() });
        }
        return data;
    });

    if (post.contentItemId) await writeAudit(uid, uid, "post.resolve", postId, { outcome }).catch(() => undefined);

    if (outcome === "retry") {
        const result = await publishPost(postId, {}, { force: true });
        return result;
    }
    const status = outcome === "published" ? POST_STATUS.PUBLISHED : POST_STATUS.FAILED;
    await mirrorToContent(post, status, outcome === "published" ? { publishedUrl: postUrl } : { error: "You marked this post as not published." });
    return { postId, status };
});

/**
 * "It's not on LinkedIn": a post we marked PUBLISHED is missing on the network. Publishes it again (only that
 * platform). The app asks the user to check first, because this posts a duplicate if it is still live.
 */
export const republishPost = onCall({ timeoutSeconds: 120 }, async (request) => {
    const uid = requireUid(request);
    const { postId, platform } = parse(republishSchema, request.data);
    let outcome;
    try {
        outcome = await republishPostCore(uid, postId, platform);
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "not-found") throw new HttpsError("not-found", "Post not found.");
        if (message === "not-published") throw new HttpsError("failed-precondition", "Only published posts can be published again.");
        if (message === "wrong-platform") throw new HttpsError("failed-precondition", "This post wasn't published to that network.");
        throw error;
    }
    if (outcome.status === "skipped") throw new HttpsError("aborted", "This post is already being published. Refresh in a moment.");
    await writeAudit(uid, uid, "post.republish", postId, { platform, status: outcome.status }).catch(() => undefined);
    return outcome;
});
