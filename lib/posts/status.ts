import type { Post, PostStatusValue } from "@/types";

/**
 * Post statuses come in mixed casing from older code ("draft", "scheduled"). Compare through this.
 * Server statuses (PUBLISHING, RETRY_PENDING, …) are set by the publisher only.
 */
export function normalizeStatus(status: Post["status"] | undefined | null): PostStatusValue | "UNKNOWN" {
    const value = String(status ?? "").toUpperCase();
    const known: PostStatusValue[] = ["DRAFT", "SCHEDULED", "PUBLISHING", "RETRY_PENDING", "PUBLISHED", "MISSED", "PARTIAL", "FAILED", "RECONCILIATION_REQUIRED"];
    return (known as string[]).includes(value) ? (value as PostStatusValue) : "UNKNOWN";
}

export type StatusTone = "draft" | "scheduled" | "published" | "warning" | "danger";

const META: Record<PostStatusValue | "UNKNOWN", { label: string; tone: StatusTone }> = {
    DRAFT: { label: "Draft", tone: "draft" },
    SCHEDULED: { label: "Scheduled", tone: "scheduled" },
    PUBLISHING: { label: "Publishing…", tone: "scheduled" },
    RETRY_PENDING: { label: "Retrying soon", tone: "warning" },
    PUBLISHED: { label: "Published", tone: "published" },
    MISSED: { label: "Missed · your call", tone: "warning" },
    PARTIAL: { label: "Partly published", tone: "warning" },
    FAILED: { label: "Failed", tone: "danger" },
    RECONCILIATION_REQUIRED: { label: "Needs your check", tone: "warning" },
    UNKNOWN: { label: "Draft", tone: "draft" },
};

export const statusMeta = (status: Post["status"] | undefined | null) => META[normalizeStatus(status)];

/** A queued post this many minutes past its time is shown as "Overdue" (the scheduler runs every 10 minutes). */
export const OVERDUE_AFTER_MIN = 30;

/** Date | ISO string | ms | Firestore Timestamp → ms. */
export function toMs(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === "function") return v.toDate().getTime();
    if (typeof v.seconds === "number") return v.seconds * 1000;
    const ms = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(String(value));
    return Number.isFinite(ms) ? ms : undefined;
}

/** When the scheduler should have published this post (queued posts only). */
export function dueAtMs(post: Pick<Post, "status" | "scheduledFor" | "nextAttemptAt">): number | undefined {
    const status = normalizeStatus(post.status);
    if (status === "SCHEDULED") return toMs(post.scheduledFor);
    if (status === "RETRY_PENDING") return toMs(post.nextAttemptAt) ?? toMs(post.scheduledFor);
    return undefined;
}

export function isOverdue(post: Pick<Post, "status" | "scheduledFor" | "nextAttemptAt">, now = Date.now()): boolean {
    const due = dueAtMs(post);
    return due !== undefined && now - due > OVERDUE_AFTER_MIN * 60_000;
}

/** Status pill for a post, including "Overdue" for queued posts the scheduler hasn't published. */
export const statusMetaFor = (post: Pick<Post, "status" | "scheduledFor" | "nextAttemptAt">, now = Date.now()) =>
    isOverdue(post, now) ? { label: "Overdue", tone: "warning" as StatusTone } : statusMeta(post.status);

/** Tailwind classes for a small status pill. */
export const statusPillClass = (tone: StatusTone) =>
    ({
        draft: "border-amber-500/20 bg-amber-500/10 text-amber-700",
        scheduled: "border-blue-500/20 bg-blue-500/10 text-blue-700",
        published: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
        warning: "border-orange-500/25 bg-orange-500/10 text-orange-700",
        danger: "border-red-500/25 bg-red-500/10 text-red-700",
    })[tone];

export const isAutopilotPost = (post: Pick<Post, "source">) => post.source === "autopilot";

/** True while the scheduler still owns the post (only Autopilot callables may reschedule approved Autopilot posts). */
export const isQueued = (post: Pick<Post, "status">) => ["SCHEDULED", "RETRY_PENDING"].includes(normalizeStatus(post.status));
