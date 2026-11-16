import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { workspaceRef } from "../autopilot/workspace";
import type { BillingMode, ProviderId, TokenUsage } from "./types";

export const usageRecordsRef = (workspaceId: string) => workspaceRef(workspaceId).collection("usageRecords");
const countersRef = (workspaceId: string) => workspaceRef(workspaceId).collection("usageCounters");

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10).replace(/-/g, "");

export type UsageStatus = "ok" | "failed" | "ambiguous";

export interface UsageRecord {
    feature: string;
    uid: string;
    personaId?: string;
    provider: ProviderId;
    model: string;
    billingMode: BillingMode;
    usage: TokenUsage;
    costMicroUsd: number;
    credits: number;
    priceVersion: string;
    status: UsageStatus;
    error?: string;
    reservationId?: string;
}

/** Write one usage record per AI call. Doc id = idempotency key, so retries don't duplicate. */
export async function recordUsage(workspaceId: string, idempotencyKey: string, record: UsageRecord): Promise<void> {
    try {
        await usageRecordsRef(workspaceId).doc(idempotencyKey).create({ ...record, createdAt: FieldValue.serverTimestamp() });
    } catch (error: unknown) {
        // ALREADY_EXISTS (6): this call was already recorded.
        if ((error as { code?: number }).code !== 6) throw error;
    }
}

/**
 * Count one call against a per-day cap and throw resource-exhausted when it's exceeded.
 * `bucket` groups calls (e.g. "editor.text", "byok").
 */
export async function consumeDailyQuota(workspaceId: string, bucket: string, cap: number, message: string): Promise<void> {
    const ref = countersRef(workspaceId).doc(`${bucket}_${dayKey()}`);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const count = (snap.data()?.count as number | undefined) ?? 0;
        if (count >= cap) throw new HttpsError("resource-exhausted", message);
        tx.set(ref, { bucket, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
}
