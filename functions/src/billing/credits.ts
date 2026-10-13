import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp, Transaction } from "firebase-admin/firestore";
import { workspaceRef } from "../autopilot/workspace";

/**
 * Credits accounting (architecture §7.3):
 * - creditWallets/main: cached { balance, reserved }
 * - creditLedger/{id}: append-only; doc id = idempotency key, so replays never double-apply
 * - creditReservations/{id}: held → settled | released
 * available = balance - reserved
 */
export const walletRef = (workspaceId: string) => workspaceRef(workspaceId).collection("creditWallets").doc("main");
export const ledgerRef = (workspaceId: string) => workspaceRef(workspaceId).collection("creditLedger");
export const reservationsRef = (workspaceId: string) => workspaceRef(workspaceId).collection("creditReservations");
export const personaUsageRef = (workspaceId: string, personaId: string, month: string) =>
    workspaceRef(workspaceId).collection("personaUsage").doc(`${personaId}_${month}`);

export const RESERVATION_TTL_MS = 10 * 60 * 1000;

export type LedgerType = "grant" | "reservation" | "consumption" | "release" | "adjustment";

export const monthKey = (date = new Date()) => `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

interface Wallet {
    balance: number;
    reserved: number;
}

async function readWallet(tx: Transaction, workspaceId: string): Promise<Wallet> {
    const snap = await tx.get(walletRef(workspaceId));
    const data = snap.data();
    return { balance: data?.balance ?? 0, reserved: data?.reserved ?? 0 };
}

function writeLedger(
    tx: Transaction,
    workspaceId: string,
    id: string,
    entry: { type: LedgerType; amount: number; balanceAfter: number; reservationId?: string; meta?: Record<string, unknown> }
) {
    tx.create(ledgerRef(workspaceId).doc(id), { ...entry, currency: "LL_CREDITS", createdAt: FieldValue.serverTimestamp() });
}

/** Add credits (trial, admin grant, later: purchases). Idempotent on `idempotencyKey`. */
export async function grantCredits(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    meta: Record<string, unknown> = {}
): Promise<{ applied: boolean; balance: number }> {
    if (!Number.isInteger(amount) || amount <= 0) throw new HttpsError("invalid-argument", "Grant amount must be a positive integer.");
    return getFirestore().runTransaction(async (tx) => {
        const entry = await tx.get(ledgerRef(workspaceId).doc(idempotencyKey));
        const wallet = await readWallet(tx, workspaceId);
        if (entry.exists) return { applied: false, balance: wallet.balance };
        const balance = wallet.balance + amount;
        tx.set(walletRef(workspaceId), { balance, reserved: wallet.reserved, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        writeLedger(tx, workspaceId, idempotencyKey, { type: "grant", amount, balanceAfter: balance, meta });
        return { applied: true, balance };
    });
}

export interface ReserveInput {
    amount: number;
    idempotencyKey: string;
    feature: string;
    personaId?: string;
    personaMonthlyLimit?: number;
}

/**
 * Atomically hold credits for an upcoming AI call. Fails with resource-exhausted when the
 * workspace (or the persona's monthly limit) can't cover the estimate. Idempotent.
 */
export async function reserveCredits(workspaceId: string, input: ReserveInput): Promise<string> {
    const reservationId = `res_${input.idempotencyKey}`;
    const amount = Math.max(1, Math.ceil(input.amount));
    await getFirestore().runTransaction(async (tx) => {
        const resRef = reservationsRef(workspaceId).doc(reservationId);
        const existing = await tx.get(resRef);
        const usageRef = input.personaId ? personaUsageRef(workspaceId, input.personaId, monthKey()) : undefined;
        const usage = usageRef ? await tx.get(usageRef) : undefined;
        const wallet = await readWallet(tx, workspaceId);
        if (existing.exists) return;

        if (wallet.balance - wallet.reserved < amount) {
            throw new HttpsError(
                "resource-exhausted",
                `Not enough AI credits (need about ${amount}, have ${Math.max(0, wallet.balance - wallet.reserved)} available).`
            );
        }
        if (input.personaMonthlyLimit !== undefined) {
            const used = (usage?.data()?.credits as number | undefined) ?? 0;
            if (used + amount > input.personaMonthlyLimit) {
                throw new HttpsError(
                    "resource-exhausted",
                    `This persona's monthly credit limit (${input.personaMonthlyLimit}) would be exceeded.`
                );
            }
        }

        tx.create(resRef, {
            amount,
            status: "held",
            feature: input.feature,
            ...(input.personaId ? { personaId: input.personaId } : {}),
            expiresAt: Timestamp.fromMillis(Date.now() + RESERVATION_TTL_MS),
            createdAt: FieldValue.serverTimestamp(),
        });
        tx.set(walletRef(workspaceId), { balance: wallet.balance, reserved: wallet.reserved + amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        writeLedger(tx, workspaceId, `${reservationId}_hold`, {
            type: "reservation",
            amount: 0,
            balanceAfter: wallet.balance,
            reservationId,
            meta: { held: amount, feature: input.feature },
        });
    });
    return reservationId;
}

/**
 * Charge the actual cost (capped at the reserved amount) and release the rest. Idempotent:
 * settling an already settled/released reservation is a no-op.
 */
export async function settleReservation(workspaceId: string, reservationId: string, actualCredits: number): Promise<number> {
    return getFirestore().runTransaction(async (tx) => {
        const resRef = reservationsRef(workspaceId).doc(reservationId);
        const res = await tx.get(resRef);
        if (!res.exists) throw new Error(`Reservation ${reservationId} not found.`);
        const data = res.data()!;
        const usageRef = data.personaId ? personaUsageRef(workspaceId, data.personaId, monthKey()) : undefined;
        const usage = usageRef ? await tx.get(usageRef) : undefined;
        const wallet = await readWallet(tx, workspaceId);
        if (data.status !== "held") return (data.charged as number | undefined) ?? 0;

        const held = data.amount as number;
        const charged = Math.min(Math.max(0, Math.ceil(actualCredits)), held);
        const balance = wallet.balance - charged;
        tx.update(resRef, {
            status: "settled",
            charged,
            ...(actualCredits > held ? { overrun: Math.ceil(actualCredits) - held } : {}),
            settledAt: FieldValue.serverTimestamp(),
        });
        tx.set(walletRef(workspaceId), { balance, reserved: Math.max(0, wallet.reserved - held), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        writeLedger(tx, workspaceId, `${reservationId}_settle`, { type: "consumption", amount: -charged, balanceAfter: balance, reservationId });
        if (usageRef) {
            tx.set(usageRef, { credits: ((usage?.data()?.credits as number | undefined) ?? 0) + charged, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
        return charged;
    });
}

/** Return held credits without charging (failed call, expiry). Idempotent. */
export async function releaseReservation(workspaceId: string, reservationId: string, reason: string): Promise<void> {
    await getFirestore().runTransaction(async (tx) => {
        const resRef = reservationsRef(workspaceId).doc(reservationId);
        const res = await tx.get(resRef);
        const wallet = await readWallet(tx, workspaceId);
        if (!res.exists || res.data()!.status !== "held") return;
        const held = res.data()!.amount as number;
        tx.update(resRef, { status: "released", releaseReason: reason, releasedAt: FieldValue.serverTimestamp() });
        tx.set(walletRef(workspaceId), { balance: wallet.balance, reserved: Math.max(0, wallet.reserved - held), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        writeLedger(tx, workspaceId, `${reservationId}_release`, {
            type: "release",
            amount: 0,
            balanceAfter: wallet.balance,
            reservationId,
            meta: { released: held, reason },
        });
    });
}
