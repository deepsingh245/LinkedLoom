import type { DocumentData } from "firebase-admin/firestore";

export const PUBLISH_PLATFORMS = ["linkedin", "reddit"] as const;
export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];

/**
 * Post lifecycle (posts/{postId}.status).
 * Clients may only write DRAFT and SCHEDULED; everything else is set by Cloud Functions.
 *
 *   DRAFT → SCHEDULED → PUBLISHING → PUBLISHED
 *                           ├→ RETRY_PENDING → PUBLISHING …  (temporary error, before anything was sent)
 *                           ├→ PARTIAL / FAILED               (definite error)
 *                           └→ RECONCILIATION_REQUIRED        (we can't tell whether it went out – the user decides)
 */
export const POST_STATUS = {
    DRAFT: "DRAFT",
    SCHEDULED: "SCHEDULED",
    PUBLISHING: "PUBLISHING",
    RETRY_PENDING: "RETRY_PENDING",
    PUBLISHED: "PUBLISHED",
    PARTIAL: "PARTIAL",
    FAILED: "FAILED",
    RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED",
} as const;
export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

/**
 * How a publish attempt failed:
 * - auth       the connection is missing/expired/revoked → user must reconnect (no retry)
 * - definite   the platform rejected the post (no retry)
 * - transient  failed before anything could have been created (safe to retry)
 * - ambiguous  the request may have reached the platform (never retried automatically: could double-post)
 */
export type PublishErrorKind = "auth" | "definite" | "transient" | "ambiguous";

export class PublishError extends Error {
    constructor(public kind: PublishErrorKind, message: string) {
        super(message);
        this.name = "PublishError";
    }
}

export interface PublishedRef {
    /** Platform id of the created post (LinkedIn URN, Reddit id). May be empty if the platform didn't return one. */
    id: string;
    url?: string;
}

export interface PublishInput {
    uid: string;
    post: DocumentData;
    connection: DocumentData;
}

/** One social network. Implementations must throw PublishError (or anything – it's classified as ambiguous). */
export interface SocialPublisher {
    platform: PublishPlatform;
    publish(input: PublishInput): Promise<PublishedRef>;
}

/** Result of one platform, stored at posts/{id}.results.{platform}. */
export interface PlatformResult {
    status: "published" | "failed" | "unknown";
    id?: string;
    url?: string;
    error?: string;
    kind?: PublishErrorKind;
    at: Date;
}
