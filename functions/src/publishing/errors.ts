import { PublishError, type PublishErrorKind } from "./types";

// Network errors where the request never reached the server: nothing can have been created.
const NOT_SENT_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ERR_INVALID_URL", "EHOSTUNREACH", "ENETUNREACH"]);

interface HttpLikeError {
    response?: { status?: number; data?: any };
    code?: string;
    message?: string;
    /** Set by publishToLinkedInInternal for failures before the post request (image upload). */
    linkedinStage?: string;
}

function platformMessage(data: any): string | undefined {
    const message = data?.message ?? data?.error_description ?? data?.error?.message ?? data?.error;
    return typeof message === "string" ? message.slice(0, 300) : undefined;
}

/**
 * Turn an axios/network error from a social API into a PublishError.
 * The important distinction is "certainly not created" (retry is safe) vs "maybe created" (ambiguous).
 */
export function classifyPublishError(error: unknown, platformName = "LinkedIn"): PublishError {
    if (error instanceof PublishError) return error;
    const e = (error ?? {}) as HttpLikeError;
    const status = e.response?.status;
    const detail = platformMessage(e.response?.data);

    // Failed while preparing (e.g. image upload) – the post itself was never sent.
    if (e.linkedinStage === "media") {
        return new PublishError("transient", `Couldn't upload the image to ${platformName}${detail ? `: ${detail}` : "."}`);
    }

    if (status !== undefined) {
        let kind: PublishErrorKind;
        if (status === 401) kind = "auth";
        else if (status === 403) kind = "auth";
        else if (status === 429 || status === 503) kind = "transient"; // rejected before processing
        else if (status >= 500) kind = "ambiguous"; // 500/502/504: the post may exist
        else kind = "definite";

        const message =
            kind === "auth" ? `${platformName} refused the request. Reconnect ${platformName} in Settings and try again.`
                : kind === "transient" ? `${platformName} is busy right now (HTTP ${status}). We'll try again shortly.`
                    : kind === "ambiguous" ? `${platformName} had an error (HTTP ${status}) and may or may not have published the post.`
                        : `${platformName} rejected the post${detail ? `: ${detail}` : ` (HTTP ${status}).`}`;
        return new PublishError(kind, message);
    }

    if (e.code && NOT_SENT_CODES.has(e.code)) {
        return new PublishError("transient", `Couldn't reach ${platformName} (${e.code}). We'll try again shortly.`);
    }
    // Timeouts, resets and unknown failures: the request may have been processed.
    return new PublishError("ambiguous", `No reply from ${platformName}${e.code ? ` (${e.code})` : ""}. The post may or may not have been published.`);
}

/** Retry delay after the n-th failed attempt (1-based): 5, 15, 45 minutes. */
export const retryDelayMs = (attempt: number) => 5 * 60_000 * Math.pow(3, Math.max(0, attempt - 1));

/** True if a stored token expiry (Date / Timestamp / ISO / ms) is in the past. Missing → not expired. */
export function isExpired(expiresAt: unknown, now = Date.now()): boolean {
    if (!expiresAt) return false;
    const value = expiresAt as { toDate?: () => Date };
    const ms = typeof value.toDate === "function" ? value.toDate().getTime()
        : expiresAt instanceof Date ? expiresAt.getTime()
            : typeof expiresAt === "number" ? expiresAt
                : Date.parse(String(expiresAt));
    return Number.isFinite(ms) && ms <= now;
}

/** LinkedIn URN → public post URL. */
export const linkedinPostUrl = (urn: string) => (urn ? `https://www.linkedin.com/feed/update/${urn}` : undefined);
