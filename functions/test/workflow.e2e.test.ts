// Scheduled + durable research through the real emulators: Cloud Tasks queue, scheduler dispatch, callables.
// AI is mocked; pages come from a local fixture server. Each scenario uses a fresh user.
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, type Auth } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore, Timestamp } from "firebase-admin/firestore";
import { HOSTS, startFixtures } from "./helpers/fixtures";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-linkedloom-test";
let fx: Awaited<ReturnType<typeof startFixtures>>;
const adminDb = () => getAdminFirestore();

type Client = { app: FirebaseApp; auth: Auth; uid: string; call: <T = any>(name: string, data?: unknown) => Promise<T>; db: ReturnType<typeof getFirestore> };
const apps: FirebaseApp[] = [];

async function client(name: string): Promise<Client> {
    const app = initializeApp({ projectId: PROJECT_ID, apiKey: "fake-api-key" }, `${name}-${Date.now()}-${Math.random()}`);
    apps.push(app);
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const fns = getFunctions(app);
    connectFunctionsEmulator(fns, "127.0.0.1", 5001);
    const cred = await createUserWithEmailAndPassword(auth, `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.dev`, "password123");
    const call = async <T,>(fn: string, data?: unknown) => (await httpsCallable(fns, fn, { timeout: 200_000 })(data)).data as T;
    return { app, auth, uid: cred.user.uid, call, db };
}

const code = async (p: Promise<unknown>) => {
    try {
        await p;
        return "ok";
    } catch (e: any) {
        return String(e.code).replace("functions/", "");
    }
};

const TERMINAL = ["completed", "partial", "failed", "cancelled", "skipped"];
async function waitForRun(c: Client, runId: string, timeoutMs = 150_000) {
    const ref = doc(c.db, "workspaces", c.uid, "workflowRuns", runId);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const run = (await getDoc(ref)).data();
        if (run && TERMINAL.includes(run.status)) return { id: runId, ...run } as any;
        if (Date.now() > deadline) throw new Error(`Run ${runId} did not finish (status=${run?.status}, step=${run?.currentStep})`);
        await new Promise((r) => setTimeout(r, 400));
    }
}
const runs = async (c: Client) => (await getDocs(collection(c.db, "workspaces", c.uid, "workflowRuns"))).docs.map((d) => ({ id: d.id, ...d.data() }) as any);
const wallet = async (c: Client) => (await getDoc(doc(c.db, "workspaces", c.uid, "creditWallets", "main"))).data()!;
const usage = async (c: Client) => (await getDocs(collection(c.db, "workspaces", c.uid, "usageRecords"))).docs.map((d) => d.data());
const scheduleDoc = (uid: string, personaId: string) => adminDb().doc(`researchSchedule/${uid}__${personaId}`);

interface PersonaOpts {
    autoRun?: boolean;
    feedUrls?: string[];
    customInstructions?: string;
    status?: "active" | "paused" | "archived";
    window?: { start: string; end: string };
}

async function seedPersona(uid: string, opts: PersonaOpts = {}): Promise<string> {
    await adminDb().doc(`workspaces/${uid}`).set({ id: uid, ownerId: uid, type: "personal" }, { merge: true });
    const ref = adminDb().collection(`workspaces/${uid}/personas`).doc();
    await ref.set({
        id: ref.id,
        workspaceId: uid,
        name: "Workflow tester",
        identity: {
            role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English",
            ...(opts.customInstructions ? { customInstructions: opts.customInstructions } : {}),
        },
        research: {
            topics: ["AI agents", "developer tools"], keywords: ["agents"], excludedTopics: ["crypto"],
            feedUrls: opts.feedUrls ?? [fx.at(HOSTS[0], "/feed.xml")], freshnessHours: 48, minSourceCount: 2, webSearch: false,
            autoRun: opts.autoRun ?? false, sourceIds: [],
        },
        publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "UTC", postingWindows: [opts.window ?? { start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
        ai: { modelProfile: "balanced", monthlyCreditLimit: 1000 },
        status: opts.status ?? "active",
        version: 1,
        createdBy: uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    return ref.id;
}

async function setup(name: string, opts: PersonaOpts = {}) {
    const c = await client(name);
    await c.call("setAutopilotEnabled", { enabled: true }); // bootstraps workspace + trial credits
    const personaId = await seedPersona(c.uid, opts);
    return { c, personaId };
}

let admin: Client;
const dispatch = async (reconcile = false) => admin.call<any>("adminDispatchResearch", { reconcile });
const outcomeFor = (res: any, personaId: string) => res.dispatched.details.find((d: any) => d.personaId === personaId);

/** Make a persona's scheduled run due now (creating its schedule entry via reconcile when needed). */
async function makeDue(uid: string, personaId: string, msAgo = 60_000) {
    await dispatch(true);
    await scheduleDoc(uid, personaId).update({ nextRunAt: Timestamp.fromMillis(Date.now() - msAgo) });
}

beforeAll(async () => {
    if (!getAdminApps().length) initAdmin({ projectId: PROJECT_ID });
    fx = await startFixtures();
    admin = await client("admin");
    await getAdminAuth().setCustomUserClaims(admin.uid, { admin: true });
    await admin.auth.currentUser!.getIdToken(true);
}, 90_000);

afterAll(async () => {
    await Promise.all(apps.map((a) => deleteApp(a)));
    await fx?.close();
});

// ---------------------------------------------------------------- durable runs through Cloud Tasks
describe("durable runs through the real task queue", () => {
    it("a transient AI failure is retried by Cloud Tasks and the user is charged once per call", async () => {
        const { c, personaId } = await setup("retry", { customInstructions: `[mock:fail-once] ${randomUUID()}` });
        const start = (await wallet(c)).balance;
        const { runId } = await c.call<{ runId: string; status: string }>("runResearch", { personaId });
        const run = await waitForRun(c, runId);

        expect(run.status).toBe("completed");
        expect(run.draftIds).toHaveLength(2);
        expect(run.completedSteps).toHaveLength(7);
        const rows = await usage(c);
        expect(rows.filter((u) => u.status === "ok")).toHaveLength(5);
        expect(rows.filter((u) => u.status === "ambiguous")).toHaveLength(2); // two failed attempts that cost nothing
        const w = await wallet(c);
        expect(w.reserved).toBe(0);
        expect(w.balance).toBe(start - rows.reduce((n, u) => n + (u.credits as number), 0));
    });

    it("a step that keeps failing ends the run as failed and frees the persona", async () => {
        const { c, personaId } = await setup("exhaust", { customInstructions: `[mock:ambiguous] ${randomUUID()}` });
        const { runId } = await c.call<{ runId: string }>("runResearch", { personaId });
        const run = await waitForRun(c, runId);
        expect(run.status).toBe("failed");
        expect(run.reason).toMatch(/generate/);
        expect((await wallet(c)).reserved).toBe(0);
        expect((await adminDb().doc(`workspaces/${c.uid}/runLocks/${personaId}`).get()).exists).toBe(false);
        // The persona can run again straight away.
        const again = await c.call<{ runId: string }>("runResearch", { personaId });
        expect(again.runId).not.toBe(runId);
        await waitForRun(c, again.runId);
    });

    it("a run in progress can be cancelled: it stops at the next step and leaves nothing behind", async () => {
        const { c, personaId } = await setup("cancel", { customInstructions: "[mock:slow]" }); // each AI call takes ~7 s (the emulator is slow to answer cancelRun)
        const { runId } = await c.call<{ runId: string }>("runResearch", { personaId });
        // Wait until the run is writing drafts, then cancel.
        const ref = doc(c.db, "workspaces", c.uid, "workflowRuns", runId);
        for (let i = 0; i < 100 && (await getDoc(ref)).data()?.currentStep !== "generate"; i++) await new Promise((r) => setTimeout(r, 200));
        expect((await getDoc(ref)).data()?.currentStep).toBe("generate");

        expect((await c.call<{ status: string }>("cancelRun", { runId })).status).toBe("cancelling");
        const run = await waitForRun(c, runId);
        expect(run.status).toBe("cancelled");
        expect(run.reason).toMatch(/Cancelled/);
        expect(run.completedSteps).not.toContain("store");
        expect((await getDocs(collection(c.db, "workspaces", c.uid, "contentItems"))).size).toBe(0);
        expect((await adminDb().doc(`workspaces/${c.uid}/runLocks/${personaId}`).get()).exists).toBe(false);
        expect((await wallet(c)).reserved).toBe(0);

        // Cancelling something that has already ended is harmless; unknown runs are reported.
        expect((await c.call<{ status: string }>("cancelRun", { runId })).status).toBe("cancelled");
        expect(await code(c.call("cancelRun", { runId: "nope" }))).toBe("not-found");
    });

    it("a run that has not started yet is cancelled immediately", async () => {
        const { c, personaId } = await setup("cancelqueued");
        const runRef = adminDb().collection(`workspaces/${c.uid}/workflowRuns`).doc();
        await adminDb().doc(`workspaces/${c.uid}/runLocks/${personaId}`).set({ runId: runRef.id, leaseExpiresAt: Timestamp.fromMillis(Date.now() + 5 * 60_000) });
        await runRef.set({
            id: runRef.id, personaId, personaName: "x", personaVersion: 1, trigger: "manual", status: "queued", completedSteps: [], steps: [], stats: {},
            notes: [], rejections: [], partial: false, cancelRequested: false, createdBy: c.uid, startedAtMs: Date.now(), createdAt: Timestamp.now(), lastProgressAt: Timestamp.now(),
        });
        expect((await c.call<{ status: string }>("cancelRun", { runId: runRef.id })).status).toBe("cancelled");
        expect((await adminDb().doc(`workspaces/${c.uid}/workflowRuns/${runRef.id}`).get()).data()).toMatchObject({ status: "cancelled" });
        expect((await adminDb().doc(`workspaces/${c.uid}/runLocks/${personaId}`).get()).exists).toBe(false);
    });

    it("the reaper restarts a run whose task was lost", async () => {
        const { c, personaId } = await setup("lost");
        // Fabricate a run that stalled right after being created: lock held, no task in the queue.
        const runRef = adminDb().collection(`workspaces/${c.uid}/workflowRuns`).doc();
        const persona = (await adminDb().doc(`workspaces/${c.uid}/personas/${personaId}`).get()).data()!;
        await adminDb().doc(`workspaces/${c.uid}/runLocks/${personaId}`).set({ runId: runRef.id, leaseExpiresAt: Timestamp.fromMillis(Date.now() + 5 * 60_000) });
        await runRef.set({
            id: runRef.id, personaId, personaName: persona.name, personaVersion: 1,
            persona: JSON.parse(JSON.stringify({ name: persona.name, version: 1, identity: persona.identity, research: persona.research, publishing: persona.publishing, ai: persona.ai, status: "active" })),
            trigger: "manual", status: "running", currentStep: "discover", completedSteps: [], steps: [], stats: {}, notes: [], rejections: [],
            partial: false, cancelRequested: false, reaperRetries: 0, createdBy: c.uid, startedAtMs: Date.now(),
            createdAt: Timestamp.fromMillis(Date.now() - 3_600_000), lastProgressAt: Timestamp.fromMillis(Date.now() - 3_600_000),
        });

        const reaped = await admin.call<any>("adminReapResearchRuns", { stuckAfterSeconds: 60 });
        expect(reaped.requeued).toBeGreaterThanOrEqual(1);
        const run = await waitForRun(c, runRef.id);
        expect(run.status).toBe("completed");
        expect(run.reaperRetries).toBe(1);
        expect(run.notes.join(" ")).toMatch(/queued again/);
        expect(run.draftIds).toHaveLength(2);
    });

    it("only completed-with-problems runs can be run again", async () => {
        const { c, personaId } = await setup("rerun");
        const { runId } = await c.call<{ runId: string }>("runResearch", { personaId });
        expect((await waitForRun(c, runId)).status).toBe("completed");
        expect(await code(c.call("retryRun", { runId }))).toBe("failed-precondition"); // nothing to retry
        expect(await code(c.call("retryRun", { runId: "nope" }))).toBe("not-found");
    });
});

// ---------------------------------------------------------------- scheduled runs
describe("scheduled research", () => {
    it("reconcile builds the schedule, the dispatcher runs due personas once, then moves the schedule forward", async () => {
        const { c, personaId } = await setup("sched", { autoRun: true });
        await dispatch(true);

        const entry = (await scheduleDoc(c.uid, personaId).get()).data()!;
        expect(entry).toMatchObject({ workspaceId: c.uid, personaId, personaVersion: 1 });
        const first = (entry.nextRunAt as Timestamp).toMillis();
        expect(first).toBeGreaterThan(Date.now()); // in the future: before the next 09:00 window
        const personaDoc = (await getDoc(doc(c.db, "workspaces", c.uid, "personas", personaId))).data()!;
        expect((personaDoc.nextRunAt as any).toMillis()).toBe(first); // mirrored so the UI can show it

        // Not due yet → nothing starts.
        expect(outcomeFor(await dispatch(), personaId)).toBeUndefined();
        expect(await runs(c)).toHaveLength(0);

        // Due → exactly one run starts.
        await scheduleDoc(c.uid, personaId).update({ nextRunAt: Timestamp.fromMillis(Date.now() - 60_000) });
        const res = await dispatch();
        expect(outcomeFor(res, personaId).outcome).toBe("started");
        const all = await runs(c);
        expect(all).toHaveLength(1);
        expect(all[0].trigger).toBe("scheduled");
        const done = await waitForRun(c, all[0].id);
        expect(done.status).toBe("completed");
        expect(done.draftIds).toHaveLength(2);

        // Claimed: the schedule moved to the next occurrence; dispatching again starts nothing.
        const next = ((await scheduleDoc(c.uid, personaId).get()).data()!.nextRunAt as Timestamp).toMillis();
        expect(next).toBeGreaterThan(Date.now());
        expect(next).toBeGreaterThan(first - 1);
        expect(outcomeFor(await dispatch(), personaId)).toBeUndefined();
        expect(await runs(c)).toHaveLength(1);
        const after = (await getDoc(doc(c.db, "workspaces", c.uid, "personas", personaId))).data()!;
        expect(after.lastRunStatus).toBe("completed");
        expect((after.nextRunAt as any).toMillis()).toBe(next);
    });

    it("personas without automatic research are never scheduled", async () => {
        const { c, personaId } = await setup("manualonly", { autoRun: false });
        await dispatch(true);
        expect((await scheduleDoc(c.uid, personaId).get()).exists).toBe(false);
        expect((await getDoc(doc(c.db, "workspaces", c.uid, "personas", personaId))).data()!.nextRunAt).toBeUndefined();
    });

    it("pauses automatic research while too many drafts wait for review, and says why", async () => {
        const { c, personaId } = await setup("pending", { autoRun: true });
        for (let i = 0; i < 6; i++) {
            await adminDb().doc(`workspaces/${c.uid}/contentItems/seed${i}`).set({ personaId, approvalStatus: "pending", state: "PENDING_APPROVAL", createdAt: Timestamp.now() });
        }
        await makeDue(c.uid, personaId);
        expect(outcomeFor(await dispatch(), personaId).outcome).toBe("skipped");
        const [run] = await runs(c);
        expect(run).toMatchObject({ status: "skipped", trigger: "scheduled" });
        expect(run.reason).toMatch(/Paused: 6 drafts are waiting/);
        expect(await usage(c)).toHaveLength(0); // no AI spend
        expect(((await scheduleDoc(c.uid, personaId).get()).data()!.nextRunAt as Timestamp).toMillis()).toBeGreaterThan(Date.now());

        // Reviewing (rejecting) drafts resumes it; "Run again" works on the skipped run.
        for (let i = 0; i < 4; i++) await adminDb().doc(`workspaces/${c.uid}/contentItems/seed${i}`).update({ approvalStatus: "rejected" });
        const retry = await c.call<{ runId: string }>("retryRun", { runId: run.id });
        const done = await waitForRun(c, retry.runId);
        expect(done).toMatchObject({ status: "completed", trigger: "retry", retryOf: run.id });
    });

    it("skips scheduled runs when credits are too low (own-key personas are exempt)", async () => {
        const { c, personaId } = await setup("lowcredit", { autoRun: true });
        await adminDb().doc(`workspaces/${c.uid}/creditWallets/main`).update({ balance: 5 });
        await makeDue(c.uid, personaId);
        expect(outcomeFor(await dispatch(), personaId).outcome).toBe("skipped");
        const [run] = await runs(c);
        expect(run.status).toBe("skipped");
        expect(run.reason).toMatch(/Low credits: 5 available/);
        expect(await usage(c)).toHaveLength(0);
    });

    it("does not start while the kill switch is on, when the window is long past, or while a run is in progress", async () => {
        const killed = await setup("killed", { autoRun: true });
        await killed.c.call("setAutopilotEnabled", { enabled: false });
        await makeDue(killed.c.uid, killed.personaId);
        expect(outcomeFor(await dispatch(), killed.personaId).outcome).toBe("stopped");
        expect(await runs(killed.c)).toHaveLength(0);

        const stale = await setup("stale", { autoRun: true });
        await makeDue(stale.c.uid, stale.personaId, 5 * 3_600_000); // 5 hours overdue (limit is 4)
        expect(outcomeFor(await dispatch(), stale.personaId).outcome).toBe("stale");
        expect(await runs(stale.c)).toHaveLength(0);
        expect(((await scheduleDoc(stale.c.uid, stale.personaId).get()).data()!.nextRunAt as Timestamp).toMillis()).toBeGreaterThan(Date.now());

        const busy = await setup("busy", { autoRun: true });
        await adminDb().doc(`workspaces/${busy.c.uid}/runLocks/${busy.personaId}`).set({ runId: "other", leaseExpiresAt: Timestamp.fromMillis(Date.now() + 5 * 60_000) });
        await makeDue(busy.c.uid, busy.personaId);
        expect(outcomeFor(await dispatch(), busy.personaId).outcome).toBe("skipped");
        expect((await runs(busy.c))[0].reason).toMatch(/still in progress/);
        expect((await adminDb().doc(`workspaces/${busy.c.uid}/runLocks/${busy.personaId}`).get()).data()!.runId).toBe("other"); // untouched
    });

    it("drops schedule entries of personas that were paused, archived or deleted behind the schedule's back", async () => {
        const { c, personaId } = await setup("stalepersona", { autoRun: true });
        await makeDue(c.uid, personaId);
        await adminDb().doc(`workspaces/${c.uid}/personas/${personaId}`).update({ status: "paused" });
        expect(outcomeFor(await dispatch(), personaId).outcome).toBe("not-schedulable");
        expect((await scheduleDoc(c.uid, personaId).get()).exists).toBe(false);
        expect(await runs(c)).toHaveLength(0);
    });
});

// ---------------------------------------------------------------- schedule stays in sync with persona edits
describe("schedule index follows persona changes", () => {
    const persona = (research: Record<string, unknown> = {}) => ({
        name: "Sync tester",
        identity: { role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English" },
        research: { topics: ["AI"], keywords: [], excludedTopics: [], feedUrls: ["https://example.com/feed.xml"], freshnessHours: 48, minSourceCount: 2, webSearch: false, autoRun: true, ...research },
        publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "Asia/Kolkata", postingWindows: [{ start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
        ai: { modelProfile: "balanced", monthlyCreditLimit: 100 },
    });

    it("create, edit, pause, resume, archive and delete keep the entry (and the persona's next run time) correct", async () => {
        const c = await client("sync");
        const { id } = await c.call<{ id: string }>("createPersona", persona());
        const personaDoc = async () => (await getDoc(doc(c.db, "workspaces", c.uid, "personas", id))).data()!;
        const entry = async () => (await scheduleDoc(c.uid, id).get()).data();

        let e = await entry();
        expect(e).toBeDefined();
        expect((e!.nextRunAt as Timestamp).toMillis()).toBeGreaterThan(Date.now());
        expect((await personaDoc()).nextRunAt).toBeDefined();
        // 09:00 in Kolkata with a 90-minute lead = 07:30 IST = 02:00 UTC
        expect(new Date((e!.nextRunAt as Timestamp).toMillis()).toISOString().slice(11, 16)).toBe("02:00");

        // Changing the window moves the run.
        await c.call("updatePersona", { personaId: id, expectedVersion: 1, persona: { ...persona(), publishing: { ...persona().publishing, postingWindows: [{ start: "18:00", end: "19:00" }] } } });
        e = await entry();
        expect(new Date((e!.nextRunAt as Timestamp).toMillis()).toISOString().slice(11, 16)).toBe("11:00"); // 18:00 − 90 min = 16:30 IST = 11:00 UTC

        // Pausing removes it, resuming restores it.
        await c.call("setPersonaStatus", { personaId: id, status: "paused" });
        expect(await entry()).toBeUndefined();
        expect((await personaDoc()).nextRunAt).toBeUndefined();
        await c.call("setPersonaStatus", { personaId: id, status: "active" });
        expect(await entry()).toBeDefined();

        // Turning automatic research off removes it.
        await c.call("updatePersona", { personaId: id, expectedVersion: 2, persona: persona({ autoRun: false }) });
        expect(await entry()).toBeUndefined();
        await c.call("updatePersona", { personaId: id, expectedVersion: 3, persona: persona({ autoRun: true }) });
        expect(await entry()).toBeDefined();

        // Archive then delete clean up.
        await c.call("setPersonaStatus", { personaId: id, status: "archived" });
        expect(await entry()).toBeUndefined();
        await c.call("deletePersona", { personaId: id });
        expect(await entry()).toBeUndefined();
    });

    it("automatic research needs a feed or web search", async () => {
        const c = await client("syncbad");
        expect(await code(c.call("createPersona", persona({ feedUrls: [], autoRun: true })))).toBe("invalid-argument");
        expect(await code(c.call("createPersona", persona({ feedUrls: [], autoRun: false })))).toBe("ok");
    });
});

// ---------------------------------------------------------------- access control
describe("who can do what", () => {
    it("only admins can trigger the dispatcher or the reaper by hand", async () => {
        const c = await client("nonadmin");
        expect(await code(c.call("adminDispatchResearch", {}))).toBe("permission-denied");
        expect(await code(c.call("adminReapResearchRuns", {}))).toBe("permission-denied");
    });

    it("schedule entries and temporary artifacts are invisible to clients, and others can't cancel or retry my runs", async () => {
        const { c, personaId } = await setup("owner", { autoRun: true });
        await dispatch(true);
        const { runId } = await c.call<{ runId: string }>("runResearch", { personaId });
        const other = await client("intruder");

        expect(await code(getDoc(doc(c.db, "researchSchedule", `${c.uid}__${personaId}`)))).toBe("permission-denied");
        expect(await code(getDocs(collection(c.db, "workspaces", c.uid, "workflowRuns", runId, "artifacts")))).toBe("permission-denied");
        expect(await code(getDocs(collection(other.db, "workspaces", c.uid, "workflowRuns")))).toBe("permission-denied");
        expect(await code(other.call("cancelRun", { runId }))).toBe("not-found");
        expect(await code(other.call("retryRun", { runId }))).toBe("not-found");

        await waitForRun(c, runId);
    });
});
