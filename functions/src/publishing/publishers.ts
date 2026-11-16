import { classifyPublishError, isExpired, linkedinPostUrl } from "./errors";
import { PublishError, type PublishPlatform, type SocialPublisher } from "./types";

// The platform modules pull in axios and create Firestore handles; load them only when publishing.
/* eslint-disable @typescript-eslint/no-var-requires */

export const linkedinPublisher: SocialPublisher = {
    platform: "linkedin",
    async publish({ post, connection }) {
        if (!connection?.accessToken || !connection?.providerUserId) {
            throw new PublishError("auth", "LinkedIn isn't connected. Connect LinkedIn in Settings.");
        }
        if (isExpired(connection.expiresAt)) {
            throw new PublishError("auth", "Your LinkedIn connection expired. Reconnect LinkedIn in Settings.");
        }
        const { publishToLinkedInInternal } = require("../linkedin") as typeof import("../linkedin");
        try {
            const data = await publishToLinkedInInternal(connection, String(post.content ?? ""), post.articleUrl || undefined, post.imageUrl || undefined);
            const id = String(data?.id ?? "");
            return { id, url: linkedinPostUrl(id) };
        } catch (error) {
            throw classifyPublishError(error, "LinkedIn");
        }
    },
};

/** Reddit stays on hold for Autopilot; manual Reddit posts keep working through the same safe path. */
export const redditPublisher: SocialPublisher = {
    platform: "reddit",
    async publish({ uid, post, connection }) {
        if (!connection) throw new PublishError("auth", "Reddit isn't connected. Connect Reddit in Settings.");
        const { publishToRedditInternal } = require("../reddit") as typeof import("../reddit");
        try {
            const result = await publishToRedditInternal(uid, connection, String(post.content ?? ""), post.subreddit || undefined, post.imageUrl || undefined);
            return { id: result.postId ?? "", url: result.postUrl };
        } catch (error) {
            // Errors raised by our own Reddit code (no HTTP response): token problems, the daily cap, rejected submissions.
            const message = error instanceof Error ? error.message : "";
            if (!(error as { response?: unknown })?.response) {
                if (/reconnect|refresh/i.test(message)) throw new PublishError("auth", message.slice(0, 300));
                if (/submission error|daily|limit/i.test(message)) throw new PublishError("definite", message.slice(0, 300));
            }
            throw classifyPublishError(error, "Reddit");
        }
    },
};

export const defaultPublishers: Record<PublishPlatform, SocialPublisher> = {
    linkedin: linkedinPublisher,
    reddit: redditPublisher,
};
