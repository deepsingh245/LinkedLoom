import { randomUUID } from "crypto";
import { FieldValue, getFirestore, Timestamp, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { classifyPublishError, retryDelayMs } from "./errors";
import { defaultPublishers } from "./publishers";
import {
    POST_STATUS, PUBLISH_PLATFORMS, PublishError,
    type PlatformResult, type PostStatus, type PublishPlatform, type SocialPublisher,
} from "./types";

const envNum = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

/** Automatic attempts for temporary errors before a post is marked FAILED. */
export const MAX_PUBLISH_ATTEMPTS = envNum("PUBLISH_MAX_ATTEMPTS", 3);
/** How long one worker owns a post while publishing. An expired lease means the worker died mid-publish. */
export const PUBLISH_LEASE_MS = envNum("PUBLISH_LEASE_MS", 5 * 60_000);

const DUE_STATUSES: string[] = [POST_STATUS.SCHEDULED, POST_STATUS.RETRY_PENDING];

export interface PublishDeps {
    publishers?: Partial<Record<PublishPlatform, SocialPublisher>>;
    now?: () => Date;
    /** Social connection lookup; defaults to users/{uid}/connections/{platform}. */
    loadConnection?: (uid: string, platform: PublishPlatform) => Promise<DocumentData | null>;
}

export interface PublishOutcome {
    postId: string;
    status: PostStatus | "skipped";
    reason?: string;
    publishedUrl?: string;
    error?: string;
}

export const postsRef = () => getFirestore().collection("posts");
const connectionRef = (uid: string, platform: PublishPlatform) =>
    getFirestore().collection("users").doc(uid).collection("connections").doc(platform);

async function defaultLoadConnection(uid: string, platform: PublishPlatform) {
    const snap = await connectionRef(uid, platform).get();
    return snap.exists ? snap.data()! : null;
}

const toMs = (value: unknown): number | undefined => {
    if (!value) return undefined;
    const v = value as { toMillis?: () => number };
    if (typeof v.toMillis === "function") return v.toMillis();
    if (value instanceof Date) return value.getTime();
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : undefined;
};

export const normalizeStatus = (status: unknown) => String(status ?? "").toUpperCase();

/**
 * Which platforms a post goes to. New posts carry `platforms`; legacy posts (written before A5) keep the
 * old behaviour – every network the user had connected at publish time.
 */
export async function targetPlatforms(uid: string, post: DocumentData, load: NonNullable<PublishDeps["loadConnection"]>): Promise<PublishPlatform[]> {
    const listed = Array.isArray(post.platforms)
        ? (post.platforms as unknown[]).filter((p): p is PublishPlatform => PUBLISH_PLATFORMS.includes(p as PublishPlatform))
        : null;
    if (listed && listed.length) return Array.from(new Set(listed));
    const connected = await Promise.all(PUBLISH_PLATFORMS.map(async (p) => ((await load(uid, p)) ? p : null)));
    return connected.filter((p): p is PublishPlatform => !!p);
}

/**
 * Atomically take ownership of a due post: SCHEDULED / RETRY_PENDING → PUBLISHING with a lease.
 * Only one worker can win, so overlapping scheduler runs or a "publish now" click can't post twice.
 * `force` skips the due-time check (publish now).
 */
export async function claimPost(ref: DocumentReference, now: Date, force = false): Promise<{ post: DocumentData; leaseId: string } | null> {
    return getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const post = snap.data()!;
        const status = normalizeStatus(post.status);
        if (!DUE_STATUSES.includes(status)) return null;
        if (!force) {
            const dueAt = status === POST_STATUS.RETRY_PENDING ? toMs(post.nextAttemptAt) : toMs(post.scheduledFor);
            if (dueAt === undefined || dueAt > now.getTime()) return null;
        }
        const leaseId = randomUUID();
        tx.update(ref, {
            status: POST_STATUS.PUBLISHING,
            publishLease: { id: leaseId, until: Timestamp.fromMillis(now.getTime() + PUBLISH_LEASE_MS) },
            attempts: FieldValue.increment(1),
            lastAttemptAt: Timestamp.fromDate(now),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { post: { ...post, attempts: Number(post.attempts ?? 0) + 1 }, leaseId };
    });
}

/** Content-item state that mirrors a post status (Autopilot drafts show it in their review list). */
const CONTENT_STATE: Partial<Record<PostStatus, string>> = {
    [POST_STATUS.SCHEDULED]: "SCHEDULED",
    [POST_STATUS.RETRY_PENDING]: "SCHEDULED",
    [POST_STATUS.PUBLISHING]: "PUBLISHING",
    [POST_STATUS.PUBLISHED]: "PUBLISHED",
    [POST_STATUS.PARTIAL]: "FAILED",
    [POST_STATUS.FAILED]: "FAILED",
    [POST_STATUS.RECONCILIATION_REQUIRED]: "RECONCILIATION_REQUIRED",
};

/** Best effort: copy the publish outcome onto the Autopilot content item the post came from. */
export async function mirrorToContent(post: DocumentData, status: PostStatus, extra: { publishedUrl?: string; error?: string } = {}) {
    if (!post.contentItemId || !post.user_id) return;
    const state = CONTENT_STATE[status];
    if (!state) return;
    const ref = getFirestore().collection("workspaces").doc(String(post.workspaceId ?? post.user_id)).collection("contentItems").doc(String(post.contentItemId));
    const patch: Record<string, unknown> = { state, updatedAt: FieldValue.serverTimestamp() };
    if (status === POST_STATUS.PUBLISHED) {
        patch.publishedAt = FieldValue.serverTimestamp();
        patch.publishError = FieldValue.delete();
        if (extra.publishedUrl) patch.publishedUrl = extra.publishedUrl;
    } else if (extra.error) {
        patch.publishError = extra.error;
    } else if (status === POST_STATUS.SCHEDULED || status === POST_STATUS.PUBLISHING) {
        patch.publishError = FieldValue.delete();
    }
    await ref.update(patch).catch((e) => logger.warn("Content mirror failed", { contentItemId: post.contentItemId, error: String(e) }));
}

/**
 * Publish one post exactly once (per platform):
 *  1. claim it (transaction + lease),
 *  2. publish to each chosen platform that hasn't succeeded yet, saving each result immediately,
 *  3. decide the final status. Ambiguous failures are never retried automatically.
 */
export async function publishPost(postId: string, deps: PublishDeps = {}, opts: { force?: boolean } = {}): Promise<PublishOutcome> {
    const now = deps.now?.() ?? new Date();
    const load = deps.loadConnection ?? defaultLoadConnection;
    const publishers = { ...defaultPublishers, ...(deps.publishers ?? {}) };
    const ref = postsRef().doc(postId);

    const claim = await claimPost(ref, now, !!opts.force);
    if (!claim) return { postId, status: "skipped", reason: "Not due, already taken, or not scheduled." };
    const { post, leaseId } = claim;
    const uid = String(post.user_id);
    await mirrorToContent(post, POST_STATUS.PUBLISHING);

    const results: Record<string, PlatformResult> = { ...(post.results ?? {}) };
    const failures: PublishError[] = [];
    let platforms: PublishPlatform[] = [];
    try {
        platforms = await targetPlatforms(uid, post, load);
    } catch (error) {
        failures.push(new PublishError("transient", "Couldn't load your connected accounts."));
        logger.warn("Loading connections failed", { postId, error: String(error) });
    }
    if (!platforms.length && !failures.length) {
        failures.push(new PublishError("auth", "No social account is connected. Connect LinkedIn in Settings."));
    }

    for (const platform of platforms) {
        if (results[platform]?.status === "published") continue; // done in an earlier attempt
        let result: PlatformResult;
        try {
            const connection = await load(uid, platform);
            if (!connection) throw new PublishError("auth", `${platform === "linkedin" ? "LinkedIn" : "Reddit"} isn't connected. Connect it in Settings.`);
            const created = await publishers[platform].publish({ uid, post, connection });
            result = { status: "published", id: created.id, ...(created.url ? { url: created.url } : {}), at: new Date() };
        } catch (error) {
            const failure = classifyPublishError(error, platform === "linkedin" ? "LinkedIn" : "Reddit");
            failures.push(failure);
            result = { status: failure.kind === "ambiguous" ? "unknown" : "failed", error: failure.message, kind: failure.kind, at: new Date() };
        }
        results[platform] = result;
        // Save each platform's result right away, so a crash after a successful post can't make us post it again.
        await ref.update({ [`results.${platform}`]: result, updatedAt: FieldValue.serverTimestamp() });
    }

    const published = platforms.filter((p) => results[p]?.status === "published");
    const attempts = Number(post.attempts ?? 1);
    let status: PostStatus;
    let error: string | undefined;
    if (platforms.length && published.length === platforms.length) status = POST_STATUS.PUBLISHED;
    else if (failures.some((f) => f.kind === "ambiguous")) {
        status = POST_STATUS.RECONCILIATION_REQUIRED;
        error = failures.find((f) => f.kind === "ambiguous")!.message + " Check your feed, then tell us whether it went out.";
    } else if (failures.length && failures.every((f) => f.kind === "transient") && attempts < MAX_PUBLISH_ATTEMPTS) {
        status = POST_STATUS.RETRY_PENDING;
        error = failures[0].message;
    } else {
        status = published.length ? POST_STATUS.PARTIAL : POST_STATUS.FAILED;
        error = failures.map((f) => f.message).join(" ") || "Publishing failed.";
    }

    const linkedin = results.linkedin;
    const publishedUrl = linkedin?.status === "published" ? linkedin.url : published.map((p) => results[p]?.url).find(Boolean);
    const final: Record<string, unknown> = {
        status,
        publishLease: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        error: error ?? FieldValue.delete(),
        nextAttemptAt: status === POST_STATUS.RETRY_PENDING ? Timestamp.fromMillis(now.getTime() + retryDelayMs(attempts)) : FieldValue.delete(),
    };
    if (status === POST_STATUS.PUBLISHED) final.publishedAt = FieldValue.serverTimestamp();
    if (linkedin?.status === "published" && linkedin.id) final.linkedinUrn = linkedin.id;
    if (publishedUrl) final.publishedUrl = publishedUrl;
    if (results.reddit?.status === "published" && results.reddit.url) final.redditUrl = results.reddit.url;

    // Only the lease holder may finish: if the user resolved the post meanwhile, keep their decision.
    const finished = await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data()!.publishLease?.id !== leaseId) return false;
        tx.update(ref, final);
        return true;
    });
    if (!finished) {
        logger.warn("Publish lease lost before finishing", { postId });
        return { postId, status: "skipped", reason: "Lease lost." };
    }
    await mirrorToContent(post, status, { publishedUrl, error });
    logger.info("Post publish finished", { postId, status, platforms, attempts });
    return { postId, status, ...(publishedUrl ? { publishedUrl } : {}), ...(error ? { error } : {}) };
}

/**
 * A PUBLISHING post whose lease ran out: the worker died mid-publish. We can't know whether the
 * remaining platforms received the post, so ask the user instead of retrying (unless every platform
 * had already reported success).
 */
export async function recoverExpiredLeases(now = new Date()): Promise<number> {
    const snap = await postsRef().where("status", "==", POST_STATUS.PUBLISHING).limit(200).get();
    let recovered = 0;
    for (const doc of snap.docs) {
        const until = toMs(doc.data().publishLease?.until);
        if (until !== undefined && until > now.getTime()) continue;
        const outcome = await getFirestore().runTransaction(async (tx) => {
            const fresh = await tx.get(doc.ref);
            const post = fresh.data();
            if (!post || normalizeStatus(post.status) !== POST_STATUS.PUBLISHING) return null;
            const leaseUntil = toMs(post.publishLease?.until);
            if (leaseUntil !== undefined && leaseUntil > now.getTime()) return null;
            const results = (post.results ?? {}) as Record<string, PlatformResult>;
            const platforms = Array.isArray(post.platforms) && post.platforms.length ? (post.platforms as string[]) : Object.keys(results);
            const allDone = platforms.length > 0 && platforms.every((p) => results[p]?.status === "published");
            const status = allDone ? POST_STATUS.PUBLISHED : POST_STATUS.RECONCILIATION_REQUIRED;
            const error = allDone ? undefined : "Publishing was interrupted, so we can't tell whether the post went out. Check your feed, then tell us.";
            tx.update(doc.ref, {
                status,
                publishLease: FieldValue.delete(),
                error: error ?? FieldValue.delete(),
                ...(allDone ? { publishedAt: FieldValue.serverTimestamp() } : {}),
                updatedAt: FieldValue.serverTimestamp(),
            });
            return { post, status, error };
        });
        if (outcome) {
            recovered++;
            await mirrorToContent(outcome.post, outcome.status, { error: outcome.error });
        }
    }
    return recovered;
}

/** One scheduler tick: recover dead workers, then publish everything that is due. */
export async function runPublishSweep(deps: PublishDeps = {}, opts: { limit?: number; concurrency?: number } = {}) {
    const now = deps.now?.() ?? new Date();
    const limit = opts.limit ?? 100;
    const recovered = await recoverExpiredLeases(now);
    const ts = Timestamp.fromDate(now);
    const [scheduled, retries] = await Promise.all([
        postsRef().where("status", "==", POST_STATUS.SCHEDULED).where("scheduledFor", "<=", ts).orderBy("scheduledFor").limit(limit).get(),
        postsRef().where("status", "==", POST_STATUS.RETRY_PENDING).where("nextAttemptAt", "<=", ts).orderBy("nextAttemptAt").limit(limit).get(),
    ]);
    const ids = Array.from(new Set([...scheduled.docs, ...retries.docs].map((d) => d.id)));

    const outcomes: PublishOutcome[] = [];
    let next = 0;
    const workers = Array.from({ length: Math.min(opts.concurrency ?? 5, ids.length) }, async () => {
        while (next < ids.length) {
            const id = ids[next++];
            try {
                outcomes.push(await publishPost(id, deps));
            } catch (error) {
                // The claim or a result write failed (Firestore). An open lease is recovered on a later tick.
                logger.error("Publishing a post crashed", { postId: id, error: String(error) });
            }
        }
    });
    await Promise.all(workers);
    return { recovered, due: ids.length, outcomes };
}
