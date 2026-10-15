import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { workspaceRef } from "../workspace";
import { acquireLock } from "./lock";
import { enqueueStep, finalizeRun, runRefOf, type EnqueueFn } from "./steps";

// Re-exported so callers have one import for run helpers.
export { runRefOf };
import { emptyStats, type RunTrigger } from "./types";
import type { DocumentData } from "firebase-admin/firestore";


/** The parts of a persona a run needs. Captured at start so editing the persona mid-run can't change the run. */
export function snapshotPersona(persona: DocumentData): DocumentData {
    return {
        name: persona.name,
        version: persona.version,
        identity: persona.identity,
        research: { ...persona.research, sourceIds: undefined },
        publishing: persona.publishing,
        ai: persona.ai,
        status: persona.status,
    };
}

interface RunInput {
    workspaceId: string;
    uid: string;
    personaId: string;
    persona: DocumentData;
    trigger: RunTrigger;
    retryOf?: string;
}

/**
 * Create a queued run (taking the persona's run lock) and queue its first step.
 * Throws failed-precondition when another run holds the lock.
 */
export async function startRun(input: RunInput, enqueue: EnqueueFn = enqueueStep): Promise<string> {
    const { workspaceId, uid, personaId, persona, trigger, retryOf } = input;
    const runRef = workspaceRef(workspaceId).collection("workflowRuns").doc();
    await acquireLock(workspaceId, personaId, runRef.id);

    try {
        // JSON round-trip drops `undefined` fields, which Firestore rejects.
        const snapshot = JSON.parse(JSON.stringify(snapshotPersona(persona)));
        await runRef.set({
            id: runRef.id,
            personaId,
            personaName: persona.name,
            personaVersion: persona.version,
            persona: snapshot,
            trigger,
            ...(retryOf ? { retryOf } : {}),
            status: "queued",
            completedSteps: [],
            steps: [],
            stats: emptyStats(),
            notes: [],
            rejections: [],
            partial: false,
            cancelRequested: false,
            reaperRetries: 0,
            createdBy: uid,
            startedAtMs: Date.now(),
            startedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastProgressAt: FieldValue.serverTimestamp(),
        });
        await enqueue({ workspaceId, runId: runRef.id, step: "discover" });
    } catch (error) {
        await finalizeRun(workspaceId, runRef.id, "failed", { personaId, note: "Could not start the run." }).catch(() => undefined);
        throw error instanceof HttpsError ? error : new HttpsError("unavailable", "Could not start the research run. Please try again.");
    }
    return runRef.id;
}

/** A run that never started (e.g. scheduled run paused by a guard). Shows up on the Runs page with its reason. */
export async function createSkippedRun(input: Omit<RunInput, "retryOf"> & { reason: string }): Promise<string> {
    const { workspaceId, uid, personaId, persona, trigger, reason } = input;
    const ref = workspaceRef(workspaceId).collection("workflowRuns").doc();
    await ref.set({
        id: ref.id,
        personaId,
        personaName: persona.name,
        personaVersion: persona.version,
        trigger,
        status: "skipped",
        reason,
        completedSteps: [],
        steps: [],
        stats: emptyStats(),
        notes: [reason],
        rejections: [],
        createdBy: uid,
        startedAtMs: Date.now(),
        startedAt: FieldValue.serverTimestamp(),
        finishedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
}
