import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { requireUid } from "../../shared/callable";
import { enqueueStep, finalizeRun, type EnqueueFn } from "./steps";
import { MAX_REAPER_RETRIES, STEP_ORDER, STUCK_AFTER_MS, type StepName } from "./types";

export interface ReapSummary {
    checked: number;
    requeued: number;
    failed: number;
}

/** The step a stuck run should continue with: `store` after an early stop, else the first unfinished step. */
export function resumeStepFor(run: { completedSteps?: string[]; partial?: boolean }): StepName {
    if (run.partial) return "store";
    const done = new Set(run.completedSteps ?? []);
    return STEP_ORDER.find((s) => !done.has(s)) ?? "store";
}

/**
 * Cloud Tasks can lose or exhaust a task, leaving a run "running" forever (and its persona locked).
 * Runs with no progress for a while get their current step queued again (twice at most);
 * after that they are marked failed so the user sees it and can run again.
 */
export async function reapStuckRuns(now = Date.now(), stuckAfterMs = STUCK_AFTER_MS, enqueue: EnqueueFn = enqueueStep): Promise<ReapSummary> {
    const summary: ReapSummary = { checked: 0, requeued: 0, failed: 0 };
    const snap = await getFirestore().collectionGroup("workflowRuns").where("status", "in", ["queued", "running"]).limit(200).get();

    for (const doc of snap.docs) {
        summary.checked++;
        const run = doc.data();
        const last = (run.lastProgressAt as Timestamp | undefined)?.toMillis() ?? (run.createdAt as Timestamp | undefined)?.toMillis() ?? now;
        if (now - last < stuckAfterMs) continue;

        const workspaceId = doc.ref.parent.parent?.id;
        if (!workspaceId) continue;
        const retries = (run.reaperRetries as number | undefined) ?? 0;

        try {
            if (retries < MAX_REAPER_RETRIES) {
                const step = resumeStepFor(run);
                await enqueue({ workspaceId, runId: doc.id, step }, `-r${retries + 1}`);
                await doc.ref.update({
                    reaperRetries: retries + 1,
                    lastProgressAt: FieldValue.serverTimestamp(),
                    notes: FieldValue.arrayUnion(`The run stalled; “${step}” was queued again.`),
                });
                summary.requeued++;
            } else {
                await finalizeRun(workspaceId, doc.id, "failed", {
                    personaId: run.personaId,
                    reason: "The run stopped responding.",
                    note: "The run stopped responding and was ended. You can run it again.",
                    uid: run.createdBy,
                });
                summary.failed++;
            }
        } catch (error) {
            logger.error("Reaper failed for run", { runId: doc.id, error: error instanceof Error ? error.message : String(error) });
        }
    }
    return summary;
}

export const reapResearchRuns = onSchedule("every 15 minutes", async () => {
    const summary = await reapStuckRuns();
    if (summary.requeued || summary.failed) logger.info("Reaped stuck research runs", summary);
});

/** Ops/testing hook (admin claim). `stuckAfterSeconds` can be lowered only inside the emulator. */
export const adminReapResearchRuns = onCall(async (request) => {
    requireUid(request);
    if (request.auth?.token.admin !== true) throw new HttpsError("permission-denied", "Admins only.");
    const data = (request.data ?? {}) as { stuckAfterSeconds?: number };
    const stuckAfterMs = process.env.FUNCTIONS_EMULATOR === "true" && typeof data.stuckAfterSeconds === "number" ? data.stuckAfterSeconds * 1000 : STUCK_AFTER_MS;
    return reapStuckRuns(Date.now(), stuckAfterMs);
});
