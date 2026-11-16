// Durable-workflow behaviour, driven in-process against the Firestore emulator.
// `processStep` and `reapStuckRuns` take an injectable enqueue function, so each scenario controls
// exactly which tasks are delivered, duplicated, lost or retried – no timing involved.
// (The full Cloud Tasks path is covered separately in workflow.e2e.test.ts.)
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.AI_PROVIDER_MOCK = "true";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.RESEARCH_ALLOW_LOCALHOST = "true";
process.env.AUTOPILOT_TRIAL_CREDITS = "200";

import { startFixtures, HOSTS } from "./helpers/fixtures";
import { ensureWorkspace } from "../src/autopilot/workspace";
import { startRun } from "../src/autopilot/research/start";
import { processStep, type StepPayload } from "../src/autopilot/research/steps";
import { reapStuckRuns } from "../src/autopilot/research/reaper";
import { runLockRef } from "../src/autopilot/research/lock";

let fx: Awaited<ReturnType<typeof startFixtures>>;
const db = () => getFirestore();

beforeAll(async () => {
    if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-linkedloom-test" });
    fx = await startFixtures();
}, 60_000);

afterAll(async () => {
    await fx?.close();
});

// ---------------------------------------------------------------- harness
class Queue {
    items: Array<{ payload: StepPayload; suffix: string }> = [];
    private seen = new Set<string>();
    /** Like Cloud Tasks: a task id (`runId-step[suffix]`) can only be queued once. */
    enqueue = async (payload: StepPayload, suffix = "") => {
        const id = `${payload.runId}-${payload.step}${suffix}`;
        if (this.seen.has(id)) return;
        this.seen.add(id);
        this.items.push({ payload, suffix });
    };
    take(step?: string) {
        const i = step ? this.items.findIndex((x) => x.payload.step === step) : 0;
        return i === -1 ? undefined : this.items.splice(i, 1)[0];
    }
}

interface Setup {
    uid: string;
    personaId: string;
    runId: string;
    q: Queue;
    persona: FirebaseFirestore.DocumentData;
}

async function setup(opts: { customInstructions?: string; minSourceCount?: number; connectionId?: string } = {}): Promise<Setup> {
    const uid = `proc-${randomUUID().slice(0, 12)}`;
    const ws = await ensureWorkspace(uid);
    const ref = db().collection(`workspaces/${ws}/personas`).doc();
    const persona = {
        id: ref.id,
        workspaceId: ws,
        name: "Process tester",
        identity: {
            role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English",
            ...(opts.customInstructions ? { customInstructions: opts.customInstructions } : {}),
        },
        research: {
            topics: ["AI agents", "developer tools"], keywords: ["agents"], excludedTopics: ["crypto"],
            feedUrls: [fx.at(HOSTS[0], "/feed.xml")], freshnessHours: 48, minSourceCount: opts.minSourceCount ?? 2, webSearch: false, autoRun: false, sourceIds: [],
        },
        publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "UTC", postingWindows: [{ start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
        ai: { modelProfile: "balanced", monthlyCreditLimit: 1000 },
        status: "active",
        version: 1,
        createdBy: uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    await ref.set(persona);
    const q = new Queue();
    const runId = await startRun({ workspaceId: ws, uid, personaId: ref.id, persona, trigger: "manual" }, q.enqueue);
    return { uid, personaId: ref.id, runId, q, persona };
}

const runDoc = async (s: Setup) => (await db().doc(`workspaces/${s.uid}/workflowRuns/${s.runId}`).get()).data()!;
const wallet = async (s: Setup) => (await db().doc(`workspaces/${s.uid}/creditWallets/main`).get()).data()!;
const usage = async (s: Setup) => (await db().collection(`workspaces/${s.uid}/usageRecords`).get()).docs.map((d) => ({ id: d.id, ...d.data() }) as any);
const artifacts = async (s: Setup) => (await db().collection(`workspaces/${s.uid}/workflowRuns/${s.runId}/artifacts`).get()).docs.map((d) => d.id);
const lockExists = async (s: Setup) => (await runLockRef(s.uid, s.personaId).get()).exists;
const contents = async (s: Setup) => (await db().collection(`workspaces/${s.uid}/contentItems`).get()).docs.map((d) => d.data());
const readArtifact = async (s: Setup, name: string) => {
    const json = (await db().doc(`workspaces/${s.uid}/workflowRuns/${s.runId}/artifacts/${name}`).get()).data()?.json;
    return json ? JSON.parse(json) : null;
};

/** Deliver queued tasks until none are left (each `processStep` may queue the next). */
async function drain(s: Setup, opts: { isLast?: boolean; until?: string } = {}) {
    for (let guard = 0; guard < 30; guard++) {
        const next = s.q.take();
        if (!next) return;
        await processStep(next.payload, { isLastAttempt: !!opts.isLast }, s.q.enqueue);
        if (opts.until && next.payload.step === opts.until) return;
    }
    throw new Error("Workflow did not finish");
}

const okUsage = (rows: any[]) => rows.filter((u) => u.status === "ok");
const uniqueMarker = (marker: string) => `${marker} ${randomUUID()}`;

// ---------------------------------------------------------------- tests
describe("a run executed step by step", () => {
    it("completes, leaves no temporary data behind, and accounts for every AI call once", async () => {
        const s = await setup();
        const start = (await wallet(s)).balance;
        expect((await runDoc(s)).status).toBe("queued");
        expect(s.q.items.map((i) => i.payload.step)).toEqual(["discover"]);

        await drain(s);

        const run = await runDoc(s);
        expect(run).toMatchObject({ status: "completed", trigger: "manual", partial: false });
        expect(run.completedSteps).toEqual(["discover", "filter", "fetch", "extract", "generate", "verify", "store"]);
        expect(run.steps.map((x: any) => x.status)).toEqual(Array(7).fill("done"));
        expect(run.stats).toMatchObject({ draftsAccepted: 2, aiCalls: 5, fetched: 4 });
        expect(run.draftIds).toHaveLength(2);

        expect(await contents(s)).toHaveLength(2);
        expect(await artifacts(s)).toEqual([]); // temporary article text is deleted when the run ends
        expect(await lockExists(s)).toBe(false);
        const persona = (await db().doc(`workspaces/${s.uid}/personas/${s.personaId}`).get()).data()!;
        expect(persona.lastRunStatus).toBe("completed");

        const rows = await usage(s);
        expect(okUsage(rows)).toHaveLength(5);
        expect(rows.filter((u) => u.status !== "ok")).toHaveLength(0);
        const w = await wallet(s);
        expect(w.reserved).toBe(0);
        expect(w.balance).toBe(start - run.stats.credits);
        expect(run.stats.credits).toBe(okUsage(rows).reduce((n, u) => n + u.credits, 0));
    });

    it("tasks can be delivered twice or concurrently without repeating work or charges", async () => {
        const s = await setup();
        // Deliver every step twice, one after the other (Cloud Tasks may do this: delivery is at-least-once).
        for (let guard = 0; guard < 20 && s.q.items.length; guard++) {
            const next = s.q.take()!;
            await processStep(next.payload, { isLastAttempt: false }, s.q.enqueue);
            await processStep(next.payload, { isLastAttempt: false }, s.q.enqueue); // duplicate delivery
        }
        const run = await runDoc(s);
        expect(run.status).toBe("completed");
        expect(run.steps).toHaveLength(7); // no duplicated step entries
        expect(await contents(s)).toHaveLength(2); // deterministic ids → no duplicate drafts
        const rows = okUsage(await usage(s));
        expect(rows).toHaveLength(5);
        expect((await wallet(s)).balance).toBe(200 - run.stats.credits);
    });

    it("two workers racing on the same step still charge the AI call once", async () => {
        const s = await setup();
        await drain(s, { until: "fetch" }); // discover, filter, fetch done; extract queued
        const extract = s.q.take("extract")!;
        await Promise.all([
            processStep(extract.payload, { isLastAttempt: false }, s.q.enqueue),
            processStep(extract.payload, { isLastAttempt: false }, s.q.enqueue),
        ]);
        const rows = (await usage(s)).filter((u) => u.feature === "autopilot.research.extract");
        expect(okUsage(rows)).toHaveLength(1); // one record for the idempotency key
        const reservations = await db().collection(`workspaces/${s.uid}/creditReservations`).get();
        const extractRes = reservations.docs.filter((d) => d.id.startsWith(`res_${s.runId}:extract`));
        expect(extractRes).toHaveLength(1);
        expect(extractRes[0].data().status).toBe("settled");
        expect((await wallet(s)).reserved).toBe(0);

        await drain(s); // finish the run normally
        const run = await runDoc(s);
        expect(run.status).toBe("completed");
        expect((await wallet(s)).balance).toBe(200 - okUsage(await usage(s)).reduce((n, u) => n + u.credits, 0));
    });
});

describe("transient failures are retried and resume from checkpoints", () => {
    it("a failed AI call is released, retried, charged once, and finished drafts aren't redone", async () => {
        const s = await setup({ customInstructions: uniqueMarker("[mock:fail-once]") });
        await drain(s, { until: "extract" }); // up to the generate step
        const generate = s.q.take("generate")!;

        // Attempt 1: draft 0's AI call fails transiently → the step throws so Cloud Tasks retries it.
        await expect(processStep(generate.payload, { isLastAttempt: false }, s.q.enqueue)).rejects.toThrow();
        expect(await readArtifact(s, "drafts")).toBeNull();
        let w = await wallet(s);
        expect(w.reserved).toBe(0); // the hold from the failed call was released
        let rows = await usage(s);
        expect(rows.filter((u) => u.feature.endsWith("generate") && u.status === "ambiguous")).toHaveLength(1);
        expect(okUsage(rows).filter((u) => u.feature.endsWith("generate"))).toHaveLength(0);

        // Attempt 2: draft 0 succeeds and is saved; draft 1's (different) prompt fails once.
        await expect(processStep(generate.payload, { isLastAttempt: false }, s.q.enqueue)).rejects.toThrow();
        expect(await readArtifact(s, "drafts")).toHaveLength(1);
        expect((await wallet(s)).reserved).toBe(0);

        // Attempt 3: resumes at draft 1 – draft 0 is NOT generated or charged again.
        await processStep(generate.payload, { isLastAttempt: false }, s.q.enqueue);
        expect(await readArtifact(s, "drafts")).toHaveLength(2);
        await drain(s);

        const run = await runDoc(s);
        expect(run.status).toBe("completed");
        expect(run.draftIds).toHaveLength(2);
        rows = await usage(s);
        const gen = okUsage(rows).filter((u) => u.feature.endsWith("generate"));
        expect(gen).toHaveLength(2); // exactly one successful, charged call per draft
        expect(new Set(gen.map((u) => u.reservationId)).size).toBe(2);
        expect(rows.filter((u) => u.status === "ambiguous")).toHaveLength(2);
        w = await wallet(s);
        expect(w.reserved).toBe(0);
        // Credits taken == credits of the successful calls (failed attempts cost the user nothing).
        expect(w.balance).toBe(200 - okUsage(rows).reduce((n, u) => n + u.credits, 0));
        const ledger = (await db().collection(`workspaces/${s.uid}/creditLedger`).get()).docs.map((d) => d.data());
        expect(ledger.filter((e) => e.type === "consumption")).toHaveLength(5);
        expect(ledger.reduce((n, e) => n + (e.amount ?? 0), 0)).toBe(w.balance); // append-only ledger explains the balance
    });

    it("when every attempt fails the run ends as failed, visibly, and frees everything", async () => {
        const s = await setup({ customInstructions: uniqueMarker("[mock:ambiguous]") });
        await drain(s, { until: "extract" });
        const generate = s.q.take("generate")!;
        await processStep(generate.payload, { isLastAttempt: true }, s.q.enqueue); // final attempt → resolves, doesn't throw

        const run = await runDoc(s);
        expect(run.status).toBe("failed");
        expect(run.reason).toMatch(/generate/);
        expect(run.steps.find((x: any) => x.name === "generate").status).toBe("failed");
        expect(run.notes.join(" ")).toMatch(/after 3 attempts/);
        expect(await lockExists(s)).toBe(false);
        expect(await artifacts(s)).toEqual([]);
        expect((await wallet(s)).reserved).toBe(0);
        expect((await db().doc(`workspaces/${s.uid}/personas/${s.personaId}`).get()).data()!.lastRunStatus).toBe("failed");
        expect(await contents(s)).toHaveLength(0);

        // Late duplicate deliveries after the end do nothing.
        await processStep(generate.payload, { isLastAttempt: true }, s.q.enqueue);
        expect(s.q.items).toHaveLength(0);
        expect((await runDoc(s)).status).toBe("failed");
    });
});

describe("stopping a run", () => {
    it("a cancel request ends the run at the next step and cleans up", async () => {
        const s = await setup();
        await drain(s, { until: "fetch" });
        await db().doc(`workspaces/${s.uid}/workflowRuns/${s.runId}`).update({ cancelRequested: true });
        await drain(s);
        const run = await runDoc(s);
        expect(run.status).toBe("cancelled");
        expect(run.reason).toMatch(/Cancelled/);
        expect(await lockExists(s)).toBe(false);
        expect(await artifacts(s)).toEqual([]);
        expect(await contents(s)).toHaveLength(0);
        expect(s.q.items).toHaveLength(0);
        expect(okUsage(await usage(s))).toHaveLength(0); // cancelled before any AI step
    });

    it("the kill switch and pausing the persona stop a run in progress", async () => {
        const killed = await setup();
        await drain(killed, { until: "filter" });
        await db().doc(`workspaces/${killed.uid}/settings/config`).update({ autopilotEnabled: false });
        await drain(killed);
        expect(await runDoc(killed)).toMatchObject({ status: "cancelled", reason: "Autopilot was stopped." });
        expect(await lockExists(killed)).toBe(false);

        const paused = await setup();
        await drain(paused, { until: "filter" });
        await db().doc(`workspaces/${paused.uid}/personas/${paused.personaId}`).update({ status: "paused" });
        await drain(paused);
        expect(await runDoc(paused)).toMatchObject({ status: "cancelled", reason: "The persona was paused or archived." });
    });

    it("running out of credits ends the run as partial, jumping straight to store", async () => {
        const s = await setup();
        await drain(s, { until: "fetch" });
        await db().doc(`workspaces/${s.uid}/creditWallets/main`).update({ balance: 0 });
        const extract = s.q.take("extract")!;
        await processStep(extract.payload, { isLastAttempt: false }, s.q.enqueue);

        const mid = await runDoc(s);
        expect(mid.partial).toBe(true);
        expect(mid.steps.find((x: any) => x.name === "extract").status).toBe("failed");
        expect(s.q.items.map((i) => i.payload.step)).toEqual(["store"]); // generate and verify are skipped

        await drain(s);
        const run = await runDoc(s);
        expect(run.status).toBe("partial");
        expect(run.notes.join(" ")).toMatch(/not enough ai credits/i);
        expect(await contents(s)).toHaveLength(0);
        expect(await lockExists(s)).toBe(false);
        expect(await wallet(s)).toMatchObject({ balance: 0, reserved: 0 });
    });

    it("a rejected BYOK key fails the run immediately instead of retrying", async () => {
        const s = await setup();
        // A connection id that doesn't exist makes the AI step fail with failed-precondition (not retryable).
        await db().doc(`workspaces/${s.uid}/workflowRuns/${s.runId}`).update({ "persona.ai.connectionId": "missing-connection" });
        await drain(s, { until: "fetch" });
        await processStep(s.q.take("extract")!.payload, { isLastAttempt: false }, s.q.enqueue); // not the last attempt, yet it must not throw
        const run = await runDoc(s);
        expect(run.status).toBe("failed");
        expect(run.reason).toMatch(/AI connection|doesn't exist/i);
        expect(await lockExists(s)).toBe(false);
    });
});

describe("lost tasks are recovered by the reaper", () => {
    it("re-queues the current step twice, then fails the run and frees the persona", async () => {
        const s = await setup();
        const first = s.q.take("discover")!;
        await processStep(first.payload, { isLastAttempt: false }, s.q.enqueue);
        s.q.items.length = 0; // simulate Cloud Tasks losing the "filter" task
        expect((await runDoc(s)).status).toBe("running");
        expect(await lockExists(s)).toBe(true);

        const mine = (q: Queue) => q.items.filter((i) => i.payload.runId === s.runId);
        const reaped = new Queue();

        expect(await reapStuckRuns(Date.now() + 1000, 0, reaped.enqueue)).toMatchObject({ requeued: expect.any(Number) });
        expect(mine(reaped).map((i) => [i.payload.step, i.suffix])).toEqual([["filter", "-r1"]]);
        expect((await runDoc(s)).reaperRetries).toBe(1);

        await reapStuckRuns(Date.now() + 2000, 0, reaped.enqueue);
        expect(mine(reaped).map((i) => i.suffix)).toEqual(["-r1", "-r2"]);

        await reapStuckRuns(Date.now() + 3000, 0, reaped.enqueue);
        expect(mine(reaped)).toHaveLength(2); // no third re-queue
        const run = await runDoc(s);
        expect(run.status).toBe("failed");
        expect(run.reason).toMatch(/stopped responding/i);
        expect(await lockExists(s)).toBe(false);
        expect(await artifacts(s)).toEqual([]);
    });

    it("a run that is making progress is left alone, and a re-queued step then finishes the run", async () => {
        const s = await setup();
        await processStep(s.q.take("discover")!.payload, { isLastAttempt: false }, s.q.enqueue);
        s.q.items.length = 0;

        const reaped = new Queue();
        await reapStuckRuns(Date.now(), 10 * 60_000, reaped.enqueue); // not stuck yet
        expect(reaped.items.filter((i) => i.payload.runId === s.runId)).toHaveLength(0);

        await reapStuckRuns(Date.now() + 1000, 0, reaped.enqueue);
        const requeued = reaped.items.filter((i) => i.payload.runId === s.runId);
        expect(requeued).toHaveLength(1);
        s.q.items.push(requeued[0]);
        await drain(s);
        expect((await runDoc(s)).status).toBe("completed");
    });
});
