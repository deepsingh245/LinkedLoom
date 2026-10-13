import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { AuditAction } from "./types";

const db = () => getFirestore();

export const workspaceRef = (workspaceId: string) => db().collection("workspaces").doc(workspaceId);
export const personasRef = (workspaceId: string) => workspaceRef(workspaceId).collection("personas");
export const settingsRef = (workspaceId: string) => workspaceRef(workspaceId).collection("settings").doc("config");

/**
 * Creates the user's personal workspace (workspaceId == uid) on first use.
 * Idempotent: safe to call from every callable.
 */
export async function ensureWorkspace(uid: string): Promise<string> {
    const ref = workspaceRef(uid);
    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) return;
        const now = FieldValue.serverTimestamp();
        tx.set(ref, { id: uid, ownerId: uid, type: "personal", createdAt: now });
        tx.set(ref.collection("members").doc(uid), { uid, role: "owner", createdAt: now });
        tx.set(settingsRef(uid), { autopilotEnabled: true, updatedAt: now });
    });
    return uid;
}

export async function writeAudit(
    workspaceId: string,
    actorId: string,
    action: AuditAction,
    targetId?: string,
    meta?: Record<string, unknown>
) {
    await workspaceRef(workspaceId).collection("auditLogs").add({
        action,
        actorId,
        ...(targetId ? { targetId } : {}),
        ...(meta ? { meta } : {}),
        createdAt: FieldValue.serverTimestamp(),
    });
}
