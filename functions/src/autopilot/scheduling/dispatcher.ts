import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { FieldValue, getFirestore, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { consumeDailyQuota } from "../../ai-core/usage";
import { errorMessage } from "../../ai-core/redact";
import { walletRef } from "../../billing/credits";
import { requireUid } from "../../shared/callable";
import { personasRef, settingsRef, workspaceRef } from "../workspace";
import { createSkippedRun, startRun } from "../research/start";
import { DAILY_RUNS, MAX_PENDING_DRAFTS, MAX_SCHEDULE_LATENESS_MS, MIN_CREDITS_TO_RUN } from "../research/types";
import { isSchedulable, nextRunFor, reconcileSchedule, scheduleCol } from "./schedule-index";

export type DispatchOutcome =
    | "started"
    | "skipped"
    | "claimed-elsewhere"
    | "not-schedulable"
    | "stale"
    | "stopped"
    | "error";

export interface DispatchSummary {
    due: number;
    outcomes: Record<DispatchOutcome, number>;
    details: Array<{ workspaceId: string; personaId: string; outcome: DispatchOutcome; reason?: string }>;
}

const emptyOutcomes = (): Record<DispatchOutcome, number> => ({
    "started": 0, "skipped": 0, "claimed-elsewhere": 0, "not-schedulable": 0, "stale": 0, "stopped": 0, "error": 0,
});

/** Why a scheduled run should not start now (a human-readable reason), or null when it may. */
async function guardReason(workspaceId: string, personaId: string, persona: DocumentData): Promise<string | null> {
    const pending = await workspaceRef(workspaceId)
        .collection("contentItems")
        .where("personaId", "==", personaId)
        .where("approvalStatus", "==", "pending")
        .count()
        .get();
    const waiting = pending.data().count;
    if (waiting >= MAX_PENDING_DRAFTS) {
        return `Paused: ${waiting} drafts are waiting for your review. Review or reject some and automatic research resumes.`;
    }

    // Own-key (BYOK) runs don't use credits.
    if (!persona.ai?.connectionId) {
        const wallet = (await walletRef(workspaceId).get()).data();
        const available = Math.max(0, (wallet?.balance ?? 0) - (wallet?.reserved ?? 0));
        if (available < MIN_CREDITS_TO_RUN) return `Low credits: ${available} available, at least ${MIN_CREDITS_TO_RUN} needed for a run.`;
    }
    return null;
}

async function handleDue(entryId: string, now: Date): Promise<{ outcome: DispatchOutcome; workspaceId?: string; personaId?: string; reason?: string }> {
    const db = getFirestore();
    const entryRef = scheduleCol().doc(entryId);

    // Claim the slot transactionally and move the schedule forward, so two dispatchers never run the same slot.
    const claim = await db.runTransaction(async (tx) => {
        const entry = await tx.get(entryRef);
        const data = entry.data();
        if (!entry.exists || !data) return null;
        const dueAt = (data.nextRunAt as Timestamp).toMillis();
        if (dueAt > now.getTime()) return null; // already claimed and advanced by another dispatcher
        const personaRef = personasRef(data.workspaceId).doc(data.personaId);
        const persona = await tx.get(personaRef);
        const personaData = persona.exists ? persona.data()! : null;
        const next = personaData && isSchedulable(personaData) ? nextRunFor(personaData, now) : null;
        if (next) {
            tx.update(entryRef, { nextRunAt: Timestamp.fromDate(next), updatedAt: FieldValue.serverTimestamp() });
            tx.update(personaRef, { nextRunAt: Timestamp.fromDate(next) });
        } else {
            tx.delete(entryRef);
            if (persona.exists) tx.update(personaRef, { nextRunAt: FieldValue.delete() });
        }
        return { workspaceId: data.workspaceId as string, personaId: data.personaId as string, dueAt, persona: personaData };
    });

    if (!claim) return { outcome: "claimed-elsewhere" };
    const { workspaceId, personaId, dueAt, persona } = claim;
    const base = { workspaceId, personaId };
    if (!persona || !isSchedulable(persona)) return { outcome: "not-schedulable", ...base };
    // The posting window this run was meant for has passed (e.g. the dispatcher was down): skip quietly.
    if (now.getTime() - dueAt > MAX_SCHEDULE_LATENESS_MS) return { outcome: "stale", ...base };

    const settings = (await settingsRef(workspaceId).get()).data();
    if (settings?.autopilotEnabled === false) return { outcome: "stopped", ...base };

    const uid = persona.createdBy as string;
    const skip = async (reason: string) => {
        await createSkippedRun({ workspaceId, uid, personaId, persona, trigger: "scheduled", reason });
        return { outcome: "skipped" as const, reason, ...base };
    };

    try {
        const reason = await guardReason(workspaceId, personaId, persona);
        if (reason) return await skip(reason);

        try {
            await consumeDailyQuota(workspaceId, "autopilot.run", DAILY_RUNS, `Daily limit of ${DAILY_RUNS} research runs reached.`);
        } catch (error) {
            if (error instanceof HttpsError && error.code === "resource-exhausted") return await skip(error.message);
            throw error;
        }

        try {
            await startRun({ workspaceId, uid, personaId, persona, trigger: "scheduled" });
        } catch (error) {
            if (error instanceof HttpsError && error.code === "failed-precondition") return await skip("The previous run is still in progress.");
            throw error;
        }
        return { outcome: "started", ...base };
    } catch (error) {
        logger.error("Scheduled research failed to start", { workspaceId, personaId, error: errorMessage(error) });
        await createSkippedRun({ workspaceId, uid, personaId, persona, trigger: "scheduled", reason: "Could not start the scheduled run." }).catch(() => undefined);
        return { outcome: "error", reason: errorMessage(error), ...base };
    }
}

/** Start every persona whose scheduled time has come. Idempotent and safe to run concurrently. */
export async function dispatchDueResearch(now = new Date()): Promise<DispatchSummary> {
    const due = await scheduleCol().where("nextRunAt", "<=", Timestamp.fromDate(now)).orderBy("nextRunAt").limit(100).get();
    const summary: DispatchSummary = { due: due.size, outcomes: emptyOutcomes(), details: [] };
    for (const entry of due.docs) {
        const result = await handleDue(entry.id, now);
        summary.outcomes[result.outcome]++;
        if (result.workspaceId && result.personaId) {
            summary.details.push({ workspaceId: result.workspaceId, personaId: result.personaId, outcome: result.outcome, reason: result.reason });
        }
    }
    return summary;
}

export const dispatchResearch = onSchedule("every 10 minutes", async () => {
    const summary = await dispatchDueResearch();
    if (summary.due) logger.info("Research dispatch", { due: summary.due, outcomes: summary.outcomes });
});

/** Daily repair of the schedule index. */
export const reconcileResearchSchedule = onSchedule("every 24 hours", async () => {
    const summary = await reconcileSchedule();
    logger.info("Research schedule reconciled", summary);
});

/**
 * Ops/testing hook: run the dispatcher (and optionally a reconcile) on demand. Admin claim required.
 * `now` can be overridden only inside the emulator, so tests can simulate time passing.
 */
export const adminDispatchResearch = onCall(async (request) => {
    requireUid(request);
    if (request.auth?.token.admin !== true) throw new HttpsError("permission-denied", "Admins only.");
    const data = (request.data ?? {}) as { now?: string; reconcile?: boolean };
    const now = data.now && process.env.FUNCTIONS_EMULATOR === "true" ? new Date(data.now) : new Date();
    const reconciled = data.reconcile ? await reconcileSchedule(now) : undefined;
    const dispatched = await dispatchDueResearch(now);
    return { dispatched, reconciled };
});
