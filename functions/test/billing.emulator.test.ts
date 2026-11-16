// Credits ledger tests directly against the Firestore emulator (Admin SDK).
// Runs inside `npm run test:e2e` (FIRESTORE_EMULATOR_HOST is set by emulators:exec).
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { Timestamp } from "firebase-admin/firestore";
import {
    grantCredits,
    releaseReservation,
    reservationsRef,
    reserveCredits,
    settleReservation,
    walletRef,
    ledgerRef,
    personaUsageRef,
    monthKey,
} from "../src/billing/credits";
import { releaseExpiredReservations } from "../src/billing/sweeper";

let ws: string;

beforeAll(() => {
    if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-linkedloom-test" });
});

beforeEach(async () => {
    ws = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await grantCredits(ws, 10, "seed");
});

const wallet = async () => (await walletRef(ws).get()).data() as { balance: number; reserved: number };
const code = async (p: Promise<unknown>) => {
    try {
        await p;
        return "ok";
    } catch (e: any) {
        return e.code ?? e.message;
    }
};

describe("credits ledger", () => {
    it("grants are idempotent", async () => {
        expect((await grantCredits(ws, 5, "g1")).applied).toBe(true);
        expect((await grantCredits(ws, 5, "g1")).applied).toBe(false);
        expect((await wallet()).balance).toBe(15);
    });

    it("reserve → settle charges actual (capped) and releases the rest", async () => {
        const res = await reserveCredits(ws, { amount: 6, idempotencyKey: "a", feature: "t" });
        expect(await wallet()).toMatchObject({ balance: 10, reserved: 6 });
        expect(await settleReservation(ws, res, 2)).toBe(2);
        expect(await wallet()).toMatchObject({ balance: 8, reserved: 0 });
        // settling again is a no-op
        expect(await settleReservation(ws, res, 5)).toBe(2);
        expect(await wallet()).toMatchObject({ balance: 8, reserved: 0 });
    });

    it("never charges more than was reserved", async () => {
        const res = await reserveCredits(ws, { amount: 3, idempotencyKey: "b", feature: "t" });
        expect(await settleReservation(ws, res, 50)).toBe(3);
        expect((await reservationsRef(ws).doc(res).get()).data()?.overrun).toBe(47);
        expect((await wallet()).balance).toBe(7);
    });

    it("release returns credits without charging and is idempotent", async () => {
        const res = await reserveCredits(ws, { amount: 4, idempotencyKey: "c", feature: "t" });
        await releaseReservation(ws, res, "failed");
        await releaseReservation(ws, res, "failed");
        expect(await wallet()).toMatchObject({ balance: 10, reserved: 0 });
        expect(await settleReservation(ws, res, 4)).toBe(0);
        expect((await wallet()).balance).toBe(10);
    });

    it("rejects reservations beyond the available balance", async () => {
        expect(await code(reserveCredits(ws, { amount: 11, idempotencyKey: "d", feature: "t" }))).toBe("resource-exhausted");
    });

    it("concurrent reservations can't overspend", async () => {
        const attempts = await Promise.allSettled(
            Array.from({ length: 6 }, (_, i) => reserveCredits(ws, { amount: 4, idempotencyKey: `p${i}`, feature: "t" }))
        );
        const ok = attempts.filter((a) => a.status === "fulfilled").length;
        expect(ok).toBe(2); // 10 credits / 4 each
        const w = await wallet();
        expect(w.reserved).toBe(8);
        expect(w.balance - w.reserved).toBeGreaterThanOrEqual(0);
    });

    it("same idempotency key reserves once", async () => {
        const a = await reserveCredits(ws, { amount: 3, idempotencyKey: "same", feature: "t" });
        const b = await reserveCredits(ws, { amount: 3, idempotencyKey: "same", feature: "t" });
        expect(a).toBe(b);
        expect((await wallet()).reserved).toBe(3);
    });

    it("enforces a persona monthly limit and tracks persona usage", async () => {
        const res = await reserveCredits(ws, { amount: 3, idempotencyKey: "m1", feature: "t", personaId: "p1", personaMonthlyLimit: 4 });
        await settleReservation(ws, res, 3);
        expect((await personaUsageRef(ws, "p1", monthKey()).get()).data()?.credits).toBe(3);
        expect(await code(reserveCredits(ws, { amount: 2, idempotencyKey: "m2", feature: "t", personaId: "p1", personaMonthlyLimit: 4 }))).toBe("resource-exhausted");
    });

    it("ledger is append-only and explains the balance", async () => {
        const res = await reserveCredits(ws, { amount: 5, idempotencyKey: "l1", feature: "t" });
        await settleReservation(ws, res, 4);
        const entries = (await ledgerRef(ws).get()).docs.map((d) => d.data());
        const net = entries.reduce((sum, e) => sum + (e.amount as number), 0);
        expect(net).toBe((await wallet()).balance);
        expect(entries.map((e) => e.type).sort()).toEqual(["consumption", "grant", "reservation"]);
    });

    it("sweeper releases expired held reservations", async () => {
        const res = await reserveCredits(ws, { amount: 5, idempotencyKey: "e1", feature: "t" });
        await reservationsRef(ws).doc(res).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
        await releaseExpiredReservations();
        expect((await reservationsRef(ws).doc(res).get()).data()?.status).toBe("released");
        expect(await wallet()).toMatchObject({ balance: 10, reserved: 0 });
    });
});

