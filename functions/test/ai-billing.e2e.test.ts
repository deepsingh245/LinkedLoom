// End-to-end tests for AI connections (BYOK), test generation, credits and editor metering.
// Runs in the emulators on project demo-linkedloom-test, where AI providers are mocked.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, type Auth } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-linkedloom-test";

type Client = {
    app: FirebaseApp;
    auth: Auth;
    uid: string;
    call: <T = any>(name: string, data?: unknown) => Promise<T>;
    db: ReturnType<typeof getFirestore>;
};

async function client(name: string): Promise<Client> {
    const app = initializeApp({ projectId: PROJECT_ID, apiKey: "fake-api-key" }, `${name}-${Date.now()}`);
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const fns = getFunctions(app);
    connectFunctionsEmulator(fns, "127.0.0.1", 5001);
    const cred = await createUserWithEmailAndPassword(auth, `${name}-${Date.now()}@test.dev`, "password123");
    const call = async <T,>(fn: string, data?: unknown) => (await httpsCallable(fns, fn, { timeout: 120_000 })(data)).data as T;
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

const persona = (overrides: Record<string, unknown> = {}) => ({
    name: "Tester",
    identity: { role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English" },
    research: { topics: ["AI agents"], keywords: [], excludedTopics: [], feedUrls: [], freshnessHours: 48, minSourceCount: 2 },
    publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "UTC", postingWindows: [{ start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
    ai: { modelProfile: "balanced", monthlyCreditLimit: 100, ...overrides },
});

const adminDb = () => getAdminFirestore();
let alice: Client;
let bob: Client;

beforeAll(async () => {
    if (!getAdminApps().length) initAdmin({ projectId: PROJECT_ID });
    alice = await client("alice");
    bob = await client("bob");
}, 60_000);

afterAll(async () => {
    await Promise.all([alice, bob].filter(Boolean).map((c) => deleteApp(c.app)));
});

const wallet = async (c: Client) => (await getDoc(doc(c.db, "workspaces", c.uid, "creditWallets", "main"))).data()!;

describe("managed credits via test generation", () => {
    let personaId: string;

    it("new workspaces get trial credits", async () => {
        personaId = (await alice.call<{ id: string }>("createPersona", persona())).id;
        expect(await wallet(alice)).toMatchObject({ balance: 200, reserved: 0 });
    });

    it("test generate charges credits and records usage", async () => {
        const res = await alice.call<any>("testPersonaGeneration", { personaId, topic: "agents in production" });
        expect(res.post).toBeTruthy();
        expect(res.billingMode).toBe("managed");
        expect(res.provider).toBe("gemini");
        expect(res.credits).toBeGreaterThanOrEqual(1);

        const w = await wallet(alice);
        expect(w.balance).toBe(200 - res.credits);
        expect(w.reserved).toBe(0);

        const usage = await getDocs(collection(alice.db, "workspaces", alice.uid, "usageRecords"));
        const rec = usage.docs.map((d) => d.data()).find((u) => u.feature === "autopilot.testGenerate");
        expect(rec).toMatchObject({ status: "ok", billingMode: "managed", credits: res.credits, personaId });
        const pu = await getDoc(doc(alice.db, "workspaces", alice.uid, "personaUsage", `${personaId}_${new Date().toISOString().slice(0, 7).replace("-", "")}`));
        expect(pu.data()?.credits).toBe(res.credits);
    });

    it("provider failures release the hold and charge nothing", async () => {
        const before = (await wallet(alice)).balance;
        expect(await code(alice.call("testPersonaGeneration", { personaId, topic: "[mock:rate_limit]" }))).toBe("resource-exhausted");
        expect(await code(alice.call("testPersonaGeneration", { personaId, topic: "[mock:ambiguous]" }))).toBe("deadline-exceeded");
        expect(await wallet(alice)).toMatchObject({ balance: before, reserved: 0 });
        const statuses = (await getDocs(collection(alice.db, "workspaces", alice.uid, "usageRecords"))).docs.map((d) => d.data().status);
        expect(statuses).toContain("failed");
        expect(statuses).toContain("ambiguous");
    });

    it("blocks when the workspace is out of credits", async () => {
        await adminDb().doc(`workspaces/${alice.uid}/creditWallets/main`).update({ balance: 0 });
        expect(await code(alice.call("testPersonaGeneration", { personaId }))).toBe("resource-exhausted");
        await adminDb().doc(`workspaces/${alice.uid}/creditWallets/main`).update({ balance: 200 });
    });

    it("blocks when the persona's monthly limit would be exceeded", async () => {
        const capped = (await alice.call<{ id: string }>("createPersona", persona({ monthlyCreditLimit: 0 }))).id;
        expect(await code(alice.call("testPersonaGeneration", { personaId: capped }))).toBe("resource-exhausted");
    });

    it("kill switch blocks generation", async () => {
        await alice.call("setAutopilotEnabled", { enabled: false });
        expect(await code(alice.call("testPersonaGeneration", { personaId }))).toBe("failed-precondition");
        await alice.call("setAutopilotEnabled", { enabled: true });
    });

    it("clients cannot write wallet or ledger", async () => {
        const { setDoc } = await import("firebase/firestore");
        expect(await code(setDoc(doc(alice.db, "workspaces", alice.uid, "creditWallets", "main"), { balance: 1e9 }))).toBe("permission-denied");
        expect(await code(setDoc(doc(alice.db, "workspaces", alice.uid, "creditLedger", "x"), { amount: 1e9 }))).toBe("permission-denied");
    });
});

describe("BYOK connections", () => {
    let connectionId: string;
    let personaId: string;

    it("rejects keys the provider rejects", async () => {
        expect(await code(alice.call("addAIConnection", { provider: "openai", label: "Bad", apiKey: "bad-key-1234567890" }))).toBe("invalid-argument");
    });

    it("stores a valid key without exposing it", async () => {
        const res = await alice.call<any>("addAIConnection", { provider: "openai", label: "My key", apiKey: "test-valid-key-abcd1234" });
        connectionId = res.id;
        expect(res).toMatchObject({ provider: "openai", keyHint: "••••1234", status: "active" });
        expect(JSON.stringify(res)).not.toContain("test-valid-key");

        const meta = (await getDoc(doc(alice.db, "workspaces", alice.uid, "aiConnections", connectionId))).data()!;
        expect(JSON.stringify(meta)).not.toContain("test-valid-key");
        expect(await code(getDoc(doc(alice.db, "workspaces", alice.uid, "aiConnectionSecrets", connectionId)))).toBe("permission-denied");
        expect(await code(getDoc(doc(bob.db, "workspaces", alice.uid, "aiConnections", connectionId)))).toBe("permission-denied");
    });

    it("persona on BYOK generates without using credits", async () => {
        personaId = (await alice.call<{ id: string }>("createPersona", persona({ connectionId }))).id;
        const before = (await wallet(alice)).balance;
        const res = await alice.call<any>("testPersonaGeneration", { personaId });
        expect(res).toMatchObject({ billingMode: "byok", provider: "openai", credits: 0 });
        expect((await wallet(alice)).balance).toBe(before);
    });

    it("another user can't attach my connection", async () => {
        expect(await code(bob.call("createPersona", persona({ connectionId })))).toBe("failed-precondition");
    });

    it("test reports a working key", async () => {
        expect((await alice.call<any>("testAIConnection", { connectionId })).status).toBe("active");
    });

    it("revoke deletes the key and moves personas back to managed credits", async () => {
        const res = await alice.call<any>("revokeAIConnection", { connectionId });
        expect(res.detachedPersonas).toBe(1);
        const p = (await getDoc(doc(alice.db, "workspaces", alice.uid, "personas", personaId))).data()!;
        expect(p.ai.connectionId).toBeUndefined();
        expect(p.version).toBe(2);
        expect(await code(alice.call("testAIConnection", { connectionId }))).toBe("not-found");
        expect((await adminDb().doc(`_emulatorSecrets/byok-${alice.uid}-${connectionId}`).get()).exists).toBe(false);
    });
});

describe("existing editor AI (metered, not charged)", () => {
    it("generatePost records usage with 0 credits and enforces the daily cap", async () => {
        const before = (await wallet(bob)).balance;
        for (let i = 0; i < 3; i++) {
            const res = await bob.call<{ content: string }>("generatePost", { topic: `topic ${i}`, tone: "professional", length: 600 });
            expect(res.content).toBeTruthy();
        }
        expect(await code(bob.call("generatePost", { topic: "one too many" }))).toBe("resource-exhausted");
        expect((await wallet(bob)).balance).toBe(before);
        const recs = (await getDocs(collection(bob.db, "workspaces", bob.uid, "usageRecords"))).docs.map((d) => d.data());
        expect(recs.filter((r) => r.feature === "editor.generatePost" && r.status === "ok")).toHaveLength(3);
        expect(recs.every((r) => r.credits === 0)).toBe(true);
    });
});

describe("admin grants", () => {
    it("requires the admin claim", async () => {
        const payload = { workspaceId: bob.uid, amount: 50, reason: "support", idempotencyKey: "grant-0001" };
        expect(await code(bob.call("adminGrantCredits", payload))).toBe("permission-denied");

        await getAdminAuth().setCustomUserClaims(alice.uid, { admin: true });
        await alice.auth.currentUser!.getIdToken(true);
        const before = (await wallet(bob)).balance;
        expect((await alice.call<any>("adminGrantCredits", payload)).applied).toBe(true);
        expect((await alice.call<any>("adminGrantCredits", payload)).applied).toBe(false);
        expect((await wallet(bob)).balance).toBe(before + 50);
    });
});
