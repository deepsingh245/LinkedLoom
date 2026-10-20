// Company context files through the real emulators: callables, limits, ownership, rules, and that a
// research run actually uses the (enabled, in-scope) files. AI is mocked; the mock echoes the first sentence
// of the company context into the draft so the test can see it reached the prompt.
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, Timestamp } from "firebase-admin/firestore";
import { HOSTS, startFixtures } from "./helpers/fixtures";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-linkedloom-test";
const adminDb = () => getAdminFirestore();
let fx: Awaited<ReturnType<typeof startFixtures>>;

type Client = { app: FirebaseApp; uid: string; call: <T = any>(name: string, data?: unknown) => Promise<T>; db: ReturnType<typeof getFirestore> };
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
    const cred = await createUserWithEmailAndPassword(auth, `${name}-${randomUUID().slice(0, 8)}@test.dev`, "password123");
    const call = async <T,>(fn: string, data?: unknown) => (await httpsCallable(fns, fn, { timeout: 200_000 })(data)).data as T;
    return { app, uid: cred.user.uid, call, db };
}

const code = async (p: Promise<unknown>) => {
    try {
        await p;
        return "ok";
    } catch (e: any) {
        return String(e.code).replace("functions/", "");
    }
};

beforeAll(async () => {
    if (!getAdminApps().length) initAdmin({ projectId: PROJECT_ID });
    fx = await startFixtures();
}, 60_000);

afterAll(async () => {
    await Promise.all(apps.map((a) => deleteApp(a).catch(() => undefined)));
    await fx?.close();
});

const at = (host: string, path: string) => `http://${host}${path}`;

async function seedPersona(uid: string, name = "Context tester"): Promise<string> {
    const ref = adminDb().collection(`workspaces/${uid}/personas`).doc();
    await ref.set({
        id: ref.id, workspaceId: uid, name, status: "active", version: 1, createdBy: uid, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
        identity: { role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English" },
        research: { topics: ["AI agents", "developer tools"], keywords: ["agents"], excludedTopics: ["crypto"], feedUrls: [at(HOSTS[0], "/feed.xml")], freshnessHours: 48, minSourceCount: 2, webSearch: false, sourceIds: [] },
        publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "UTC", postingWindows: [{ start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
        ai: { modelProfile: "balanced", monthlyCreditLimit: 1000 },
    });
    return ref.id;
}

async function setup(name: string) {
    const c = await client(name);
    await c.call("setAutopilotEnabled", { enabled: true });
    return c;
}

const ABOUT = "# About\nWe, Acme Robotics, build warehouse robots for mid-size retailers.\n\nOur voice is friendly and direct.";

describe("context files: callables", () => {
    it("adds, lists, toggles, rescopes and deletes a file; the full text stays server-side", async () => {
        const c = await setup("ctx-crud");
        const personaId = await seedPersona(c.uid);

        const added = await c.call<{ id: string; size: number }>("addContextDoc", { name: "about.md", text: ABOUT, personaId: null });
        expect(added.size).toBe(ABOUT.length);

        const meta = (await getDoc(doc(c.db, "workspaces", c.uid, "contextDocs", added.id))).data()!;
        expect(meta).toMatchObject({ name: "about.md", kind: "md", size: ABOUT.length, enabled: true, personaId: null });
        expect(meta.preview).toContain("Acme Robotics");
        expect(meta.text).toBeUndefined();
        // The text document is not readable by the owner either (rules), only by functions.
        expect(await code(getDoc(doc(c.db, "workspaces", c.uid, "contextTexts", added.id)))).toBe("permission-denied");
        expect((await adminDb().doc(`workspaces/${c.uid}/contextTexts/${added.id}`).get()).data()).toEqual({ text: ABOUT });

        await c.call("updateContextDoc", { docId: added.id, enabled: false });
        await c.call("updateContextDoc", { docId: added.id, personaId });
        expect((await getDoc(doc(c.db, "workspaces", c.uid, "contextDocs", added.id))).data()).toMatchObject({ enabled: false, personaId });
        expect(await code(c.call("updateContextDoc", { docId: added.id, personaId: "nope" }))).toBe("not-found");
        expect(await code(c.call("updateContextDoc", { docId: added.id }))).toBe("invalid-argument");

        await c.call("deleteContextDoc", { docId: added.id });
        expect((await getDocs(collection(c.db, "workspaces", c.uid, "contextDocs"))).size).toBe(0);
        expect((await adminDb().doc(`workspaces/${c.uid}/contextTexts/${added.id}`).get()).exists).toBe(false);
        expect(await code(c.call("deleteContextDoc", { docId: added.id }))).toBe("not-found");
    });

    it("rejects unsupported, empty, binary and oversized files", async () => {
        const c = await setup("ctx-invalid");
        expect(await code(c.call("addContextDoc", { name: "notes.pdf", text: ABOUT }))).toBe("invalid-argument");
        expect(await code(c.call("addContextDoc", { name: "empty.txt", text: "   \n " }))).toBe("invalid-argument");
        expect(await code(c.call("addContextDoc", { name: "blob.txt", text: `PK\u0000\u0003${"x".repeat(100)}` }))).toBe("invalid-argument");
        expect(await code(c.call("addContextDoc", { name: "big.md", text: "a".repeat(50_001) }))).toBe("invalid-argument");
        expect(await code(c.call("addContextDoc", { name: "x.md", text: ABOUT, personaId: "missing" }))).toBe("not-found");
        expect(await code(c.call("addContextDoc", { name: "x.md", text: ABOUT, extra: true }))).toBe("invalid-argument");
        expect((await getDocs(collection(c.db, "workspaces", c.uid, "contextDocs"))).size).toBe(0);
    });

    it("enforces the file-count and total-size limits", async () => {
        const c = await setup("ctx-limits");
        const text = (n: number) => `Company facts: ${"x".repeat(n)}`;
        for (let i = 0; i < 4; i++) await c.call("addContextDoc", { name: `big${i}.txt`, text: text(49_900) });
        // 4 × ~50k = ~200k stored: the next big one would pass 200,000 in total.
        expect(await code(c.call("addContextDoc", { name: "big4.txt", text: text(49_900) }))).toBe("resource-exhausted");

        const d = await setup("ctx-count");
        for (let i = 0; i < 10; i++) await d.call("addContextDoc", { name: `f${i}.md`, text: text(100) });
        expect(await code(d.call("addContextDoc", { name: "f10.md", text: text(100) }))).toBe("resource-exhausted");
    });

    it("keeps workspaces separate and requires sign-in", async () => {
        const alice = await setup("ctx-alice");
        const bob = await setup("ctx-bob");
        const { id } = await alice.call<{ id: string }>("addContextDoc", { name: "a.md", text: ABOUT });
        expect(await code(getDoc(doc(bob.db, "workspaces", alice.uid, "contextDocs", id)))).toBe("permission-denied");
        // Bob's callable only ever looks in Bob's workspace.
        expect(await code(bob.call("deleteContextDoc", { docId: id }))).toBe("not-found");
        expect(await code(bob.call("updateContextDoc", { docId: id, enabled: false }))).toBe("not-found");
        expect((await getDoc(doc(alice.db, "workspaces", alice.uid, "contextDocs", id))).exists()).toBe(true);
    });
});

describe("context files: used by research", () => {
    async function runAndWait(c: Client, personaId: string) {
        const { runId } = await c.call<{ runId: string }>("runResearch", { personaId });
        const ref = doc(c.db, "workspaces", c.uid, "workflowRuns", runId);
        const deadline = Date.now() + 150_000;
        for (;;) {
            const run = (await getDoc(ref)).data();
            if (run && ["completed", "partial", "failed", "cancelled", "skipped"].includes(run.status)) return { id: runId, ...run } as any;
            if (Date.now() > deadline) throw new Error(`Run ${runId} did not finish (status=${run?.status})`);
            await new Promise((r) => setTimeout(r, 400));
        }
    }
    const drafts = async (c: Client) => (await getDocs(collection(c.db, "workspaces", c.uid, "contentItems"))).docs.map((d) => d.data());

    it("drafts mention the company when an enabled, in-scope file exists – and still pass fact-checking", async () => {
        const c = await setup("ctx-run");
        const personaId = await seedPersona(c.uid);
        await c.call("addContextDoc", { name: "about.md", text: ABOUT, personaId });

        const run = await runAndWait(c, personaId);
        expect(run.status).toBe("completed");
        const items = await drafts(c);
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.masterDraft).toContain("Acme Robotics");
            expect(item.verification).toMatchObject({ deterministic: "passed", ai: "passed" });
        }
        // The temporary copy of the context is deleted with the run's other artifacts.
        expect((await adminDb().collection(`workspaces/${c.uid}/workflowRuns/${run.id}/artifacts`).get()).size).toBe(0);
    });

    it("ignores disabled files and files scoped to another persona", async () => {
        const c = await setup("ctx-scope");
        const personaId = await seedPersona(c.uid);
        const other = await seedPersona(c.uid, "Someone else");
        const a = await c.call<{ id: string }>("addContextDoc", { name: "off.md", text: ABOUT, personaId: null });
        await c.call("updateContextDoc", { docId: a.id, enabled: false });
        await c.call("addContextDoc", { name: "other.md", text: "We, Globex Corporation, make something else entirely.", personaId: other });

        const run = await runAndWait(c, personaId);
        expect(run.status).toBe("completed");
        const items = await drafts(c);
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.masterDraft).not.toContain("Acme Robotics");
            expect(item.masterDraft).not.toContain("Globex");
        }
    });
});
