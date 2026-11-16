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
    const wallet = ref.collection("creditWallets").doc("main");
    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const walletSnap = await tx.get(wallet);
        const now = FieldValue.serverTimestamp();
        if (!snap.exists) {
            tx.set(ref, { id: uid, ownerId: uid, type: "personal", createdAt: now });
            tx.set(ref.collection("members").doc(uid), { uid, role: "owner", createdAt: now });
            tx.set(settingsRef(uid), { autopilotEnabled: true, updatedAt: now });
        }
        // One-time trial credits (also back-fills workspaces created before credits existed).
        if (!walletSnap.exists) {
            tx.set(wallet, { balance: TRIAL_CREDITS, reserved: 0, updatedAt: now });
            tx.set(ref.collection("creditLedger").doc("trial-grant"), {
                type: "grant",
                amount: TRIAL_CREDITS,
                balanceAfter: TRIAL_CREDITS,
                currency: "LL_CREDITS",
                meta: { reason: "trial" },
                createdAt: now,
            });
        }
    });
    return uid;
}

/** Credits every new workspace starts with (no payments until A6). */
export const TRIAL_CREDITS = Number(process.env.AUTOPILOT_TRIAL_CREDITS || 200);

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
