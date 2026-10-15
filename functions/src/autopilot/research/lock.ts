import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { workspaceRef } from "../workspace";
import { RESEARCH_LIMITS } from "./types";

export const runLockRef = (workspaceId: string, personaId: string) => workspaceRef(workspaceId).collection("runLocks").doc(personaId);

/** One research run per persona at a time. The lease expires so a crashed run can't block forever. */
export async function acquireLock(workspaceId: string, personaId: string, runId: string): Promise<void> {
    const ref = runLockRef(workspaceId, personaId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const lease = snap.data()?.leaseExpiresAt as Timestamp | undefined;
        if (snap.exists && lease && lease.toMillis() > Date.now()) {
            throw new HttpsError("failed-precondition", "A research run is already in progress for this persona.");
        }
        tx.set(ref, { runId, leaseExpiresAt: Timestamp.fromMillis(Date.now() + RESEARCH_LIMITS.runLeaseMs), startedAt: FieldValue.serverTimestamp() });
    });
}

/** Whether a (non-expired) lock is held by a different run. */
export async function isLockedByOther(workspaceId: string, personaId: string, runId?: string): Promise<boolean> {
    const data = (await runLockRef(workspaceId, personaId).get()).data();
    const lease = data?.leaseExpiresAt as Timestamp | undefined;
    return !!data && !!lease && lease.toMillis() > Date.now() && data.runId !== runId;
}

/** Extend the lease. Returns false when the lock now belongs to another run. */
export async function extendLock(workspaceId: string, personaId: string, runId: string): Promise<boolean> {
    const ref = runLockRef(workspaceId, personaId);
    return getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.data()?.runId !== runId) return false;
        tx.update(ref, { leaseExpiresAt: Timestamp.fromMillis(Date.now() + RESEARCH_LIMITS.runLeaseMs) });
        return true;
    });
}

export async function releaseLock(workspaceId: string, personaId: string, runId: string): Promise<void> {
    const ref = runLockRef(workspaceId, personaId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.data()?.runId === runId) tx.delete(ref);
    }).catch(() => undefined);
}
