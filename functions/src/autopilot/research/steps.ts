import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import { logger } from "firebase-functions/v2";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { defineInt } from "firebase-functions/params";
import { z } from "zod";
import { errorMessage } from "../../ai-core/redact";
import { personasRef, settingsRef, workspaceRef, writeAudit } from "../workspace";
import { deleteArtifacts } from "./artifacts";
import { CancelRun, classifyError, StopRun } from "./errors";
import { extendLock, runLockRef } from "./lock";
import {
    buildStepCtx, stepDiscover, stepExtract, stepFetch, stepFilter, stepGenerate, stepStore, stepVerify,
    type StepCtx, type StepOutcome,
} from "./pipeline";
import {
    emptyStats, nextStepOf, STEP_MAX_ATTEMPTS, TERMINAL_STATUSES,
    type RunStatus, type RunStep, type StepName,
} from "./types";

export const runRefOf = (workspaceId: string, runId: string) => workspaceRef(workspaceId).collection("workflowRuns").doc(runId);

export interface StepPayload {
    workspaceId: string;
    runId: string;
    step: StepName;
}

const payloadSchema = z.object({
    workspaceId: z.string().min(1).max(128),
    runId: z.string().min(1).max(128),
    step: z.enum(["discover", "filter", "fetch", "extract", "generate", "verify", "store"]),
});

const TASK_QUEUE = "researchStep";

/**
 * Queue one step. The task id makes the call idempotent (queueing the same step twice is a no-op);
 * `suffix` is used by the reaper to re-queue a step whose task was lost.
 */
export async function enqueueStep(payload: StepPayload, suffix = ""): Promise<void> {
    try {
        await getFunctions().taskQueue(TASK_QUEUE).enqueue(payload, {
            id: `${payload.runId}-${payload.step}${suffix}`,
            dispatchDeadlineSeconds: 300,
        });
    } catch (error) {
        const code = String((error as { code?: string }).code ?? "");
        if (code.includes("already-exists")) return; // the step is already queued
        throw error;
    }
}

const STEP_FUNCTIONS: Record<StepName, (ctx: StepCtx) => Promise<StepOutcome & { draftIds?: string[] }>> = {
    discover: stepDiscover,
    filter: stepFilter,
    fetch: stepFetch,
    extract: stepExtract,
    generate: stepGenerate,
    verify: stepVerify,
    store: stepStore,
};

/** The step to queue after `step`: when the run stopped early, jump straight to `store` (keeps what's verified so far). */
export const followingStep = (step: StepName, partial: boolean): StepName | null => (step === "store" ? null : partial ? "store" : nextStepOf(step));

/**
 * End a run: set its final status, delete temporary artifacts, release the persona lock and record
 * the outcome on the persona (so the UI can show it).
 */
export async function finalizeRun(
    workspaceId: string,
    runId: string,
    status: RunStatus,
    opts: { personaId: string; reason?: string; note?: string; draftIds?: string[]; stats?: unknown; steps?: RunStep[]; uid?: string }
): Promise<void> {
    const update: Record<string, unknown> = {
        status,
        finishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastProgressAt: FieldValue.serverTimestamp(),
    };
    if (opts.reason) update.reason = opts.reason;
    if (opts.note) update.notes = FieldValue.arrayUnion(opts.note);
    if (opts.draftIds) update.draftIds = opts.draftIds;
    if (opts.stats) update.stats = opts.stats;
    if (opts.steps) update.steps = opts.steps;
    // Only the first finalizer wins: a duplicate or late worker must never turn "cancelled" into "completed" (or the reverse).
    const runRef = runRefOf(workspaceId, runId);
    const lockRef = runLockRef(workspaceId, opts.personaId);
    await getFirestore().runTransaction(async (tx) => {
        const [runSnap, lockSnap] = await Promise.all([tx.get(runRef), tx.get(lockRef)]);
        const current = runSnap.data()?.status as RunStatus | undefined;
        if (current && TERMINAL_STATUSES.includes(current)) return;
        if (lockSnap.data()?.runId === runId) tx.delete(lockRef);
        tx.set(runRef, update, { merge: true });
    });

    await deleteArtifacts(workspaceId, runId).catch((e) => logger.warn("Artifact cleanup failed", { runId, error: errorMessage(e) }));
    // Best effort: persona may have been deleted.
    await personasRef(workspaceId).doc(opts.personaId).update({ lastRunAt: FieldValue.serverTimestamp(), lastRunStatus: status }).catch(() => undefined);
    if (opts.uid) await writeAudit(workspaceId, opts.uid, "research.run", opts.personaId, { runId, status }).catch(() => undefined);
}

/** Cancellation / pause / kill switch checks, run before every step. */
async function assertShouldContinue(workspaceId: string, personaId: string, runId: string, run: FirebaseFirestore.DocumentData): Promise<void> {
    if (run.cancelRequested) throw new CancelRun("Cancelled by you.");
    const [settings, persona] = await Promise.all([settingsRef(workspaceId).get(), personasRef(workspaceId).doc(personaId).get()]);
    if (settings.data()?.autopilotEnabled === false) throw new CancelRun("Autopilot was stopped.");
    if (!persona.exists || persona.data()?.status !== "active") throw new CancelRun("The persona was paused or archived.");
    if (!(await extendLock(workspaceId, personaId, runId))) throw new CancelRun("Another run took over this persona.");
}

const upsertStep = (steps: RunStep[], name: StepName, patch: Partial<RunStep>): RunStep[] => {
    const next = steps.map((s) => ({ ...s }));
    const existing = next.find((s) => s.name === name);
    if (existing) Object.assign(existing, patch);
    else next.push({ name, status: "running", startedAt: Date.now(), ...patch });
    return next;
};

/**
 * Run one step of a research run. Safe to call more than once for the same step (duplicate delivery,
 * retry, reaper re-queue): completed steps are skipped, partial work resumes from its checkpoints.
 * Throws only for transient errors that Cloud Tasks should retry.
 */
export type EnqueueFn = (payload: StepPayload, suffix?: string) => Promise<void>;

export async function processStep(payload: StepPayload, opts: { isLastAttempt: boolean }, enqueue: EnqueueFn = enqueueStep): Promise<void> {
    const { workspaceId, runId, step } = payload;
    const runRef = runRefOf(workspaceId, runId);
    const snap = await runRef.get();
    if (!snap.exists) return;
    const run = snap.data()!;
    if (TERMINAL_STATUSES.includes(run.status)) return;
    const personaId = run.personaId as string;

    // Duplicate delivery: this step already finished, so just make sure the next one is queued.
    if ((run.completedSteps as string[] | undefined)?.includes(step)) {
        const next = followingStep(step, !!run.partial);
        if (next) await enqueue({ workspaceId, runId, step: next });
        return;
    }

    try {
        await assertShouldContinue(workspaceId, personaId, runId, run);
    } catch (error) {
        if (error instanceof CancelRun) {
            await finalizeRun(workspaceId, runId, "cancelled", { personaId, reason: error.message, note: error.message, uid: run.createdBy });
            return;
        }
        throw error; // transient lookup failure → retry
    }

    let steps = upsertStep((run.steps as RunStep[]) ?? [], step, { status: "running", startedAt: Date.now(), finishedAt: undefined, note: undefined });
    await runRef.update({ status: "running", currentStep: step, steps: JSON.parse(JSON.stringify(steps)), lastProgressAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });

    const ctx = buildStepCtx({
        workspaceId,
        uid: run.createdBy,
        runId,
        runRef,
        personaId,
        persona: run.persona,
        stats: { ...emptyStats(), ...(run.stats ?? {}) },
        notes: [...(run.notes ?? [])],
        rejections: [...(run.rejections ?? [])],
        startedAtMs: run.startedAtMs ?? Date.now(),
    });

    let outcome: StepOutcome & { draftIds?: string[] };
    let partial = !!run.partial;
    try {
        outcome = await STEP_FUNCTIONS[step](ctx);
    } catch (error) {
        const action = classifyError(error);
        logger.warn("Research step error", { runId, step, action, error: errorMessage(error) });

        if (action === "retry") {
            if (!opts.isLastAttempt) throw error; // let Cloud Tasks retry with backoff (progress is checkpointed)
            steps = upsertStep(steps, step, { status: "failed", finishedAt: Date.now(), note: errorMessage(error) });
            ctx.addNote(`Step “${step}” failed after ${STEP_MAX_ATTEMPTS} attempts: ${errorMessage(error)}`);
            await finalizeRun(workspaceId, runId, "failed", {
                personaId, reason: `Step “${step}” kept failing.`, stats: ctx.stats, steps: JSON.parse(JSON.stringify(steps)), uid: run.createdBy,
                note: `Step “${step}” failed after ${STEP_MAX_ATTEMPTS} attempts: ${errorMessage(error)}`,
            });
            await runRef.update({ rejections: ctx.rejections });
            return;
        }

        if (action === "fail") {
            steps = upsertStep(steps, step, { status: "failed", finishedAt: Date.now(), note: errorMessage(error) });
            await finalizeRun(workspaceId, runId, "failed", {
                personaId, reason: errorMessage(error), stats: ctx.stats, steps: JSON.parse(JSON.stringify(steps)), uid: run.createdBy, note: errorMessage(error),
            });
            return;
        }

        // stop: out of credits or a limit. Keep what we have: go straight to `store`.
        const message = error instanceof StopRun || error instanceof Error ? error.message : "Run stopped.";
        ctx.addNote(message);
        steps = upsertStep(steps, step, { status: "failed", finishedAt: Date.now(), note: message });
        partial = true;
        if (step === "store") {
            await finalizeRun(workspaceId, runId, "failed", { personaId, reason: message, stats: ctx.stats, steps: JSON.parse(JSON.stringify(steps)), uid: run.createdBy });
            return;
        }
        outcome = { state: "failed", note: message };
    }

    steps = upsertStep(steps, step, { status: outcome.state, finishedAt: Date.now(), ...(outcome.note ? { note: outcome.note } : {}) });
    const common = {
        steps: JSON.parse(JSON.stringify(steps)),
        stats: ctx.stats,
        notes: ctx.notes,
        rejections: ctx.rejections,
        partial,
        completedSteps: FieldValue.arrayUnion(step),
        lastProgressAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (step === "store") {
        await runRef.update(common);
        await finalizeRun(workspaceId, runId, partial ? "partial" : "completed", {
            personaId,
            draftIds: outcome.draftIds ?? [],
            stats: ctx.stats,
            uid: run.createdBy,
            ...(partial ? { reason: ctx.notes[ctx.notes.length - 1] } : {}),
        });
        return;
    }

    await runRef.update(common);
    const next = followingStep(step, partial);
    if (next) await enqueue({ workspaceId, runId, step: next });
}

// Backoff before Cloud Tasks retries a failed step (tests set it to 1 second).
const retryBackoffSeconds = defineInt("RESEARCH_RETRY_MIN_BACKOFF", { default: 15 });

/** Cloud Tasks entry point: one invocation = one step. */
export const researchStep = onTaskDispatched(
    {
        retryConfig: { maxAttempts: STEP_MAX_ATTEMPTS, minBackoffSeconds: retryBackoffSeconds, maxBackoffSeconds: 300, maxDoublings: 3 },
        rateLimits: { maxConcurrentDispatches: 10 },
        timeoutSeconds: 300,
        memory: "512MiB",
    },
    async (request) => {
        const payload = payloadSchema.parse(request.data);
        const isLastAttempt = (request.retryCount ?? 0) >= STEP_MAX_ATTEMPTS - 1;
        await processStep(payload, { isLastAttempt });
    }
);
