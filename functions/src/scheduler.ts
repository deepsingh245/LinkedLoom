import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { runPublishSweep } from "./publishing/publish-post";

/**
 * Publish due posts every 10 minutes. All the safety lives in publishing/publish-post.ts:
 * a transactional claim per post (no double posting when runs overlap), per-platform results,
 * retries only for errors that happened before anything was sent, and RECONCILIATION_REQUIRED
 * when we can't tell whether a post went out.
 */
export const checkScheduledPosts = onSchedule({ schedule: "every 10 minutes", timeoutSeconds: 540 }, async () => {
    const { recovered, due, outcomes } = await runPublishSweep();
    if (!due && !recovered) return;
    const byStatus = outcomes.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
    logger.info("Publish sweep finished", { due, recovered, byStatus });
});
