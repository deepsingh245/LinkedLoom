// End-to-end tests for the Autopilot persona callables against the emulators.
//   npm run test:e2e   (builds, then runs inside firebase emulators:exec with auth, firestore and functions)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, getFirestore, setDoc } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "linkedloom";

const persona = () => ({
    name: "AI & Technology Expert",
    identity: { role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English" },
    research: { topics: ["AI"], keywords: [], excludedTopics: [], feedUrls: [], freshnessHours: 48, minSourceCount: 2 },
    publishing: {
        accountIds: ["linkedin"],
        postsPerDay: 1,
        timezone: "UTC",
        postingWindows: [{ start: "09:00", end: "10:00" }],
        approvalMode: "manual",
        allowImages: false,
    },
    ai: { modelProfile: "balanced", monthlyCreditLimit: 100 },
});

type Client = { app: FirebaseApp; uid: string; call: <T = any>(name: string, data?: unknown) => Promise<T>; db: ReturnType<typeof getFirestore> };

async function client(name: string): Promise<Client> {
    const app = initializeApp({ projectId: PROJECT_ID, apiKey: "fake-api-key" }, name);
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const fns = getFunctions(app);
    connectFunctionsEmulator(fns, "127.0.0.1", 5001);
    const cred = await createUserWithEmailAndPassword(auth, `${name}-${Date.now()}@test.dev`, "password123");
    const call = async <T,>(fn: string, data?: unknown) => (await httpsCallable(fns, fn)(data)).data as T;
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

let alice: Client;
let bob: Client;

beforeAll(async () => {
    alice = await client("alice");
    bob = await client("bob");
}, 60_000);

afterAll(async () => {
    await Promise.all([alice, bob].filter(Boolean).map((c) => deleteApp(c.app)));
});

describe("persona callables", () => {
    let personaId: string;

    it("creates a persona and bootstraps the workspace", async () => {
        const res = await alice.call<{ id: string; version: number }>("createPersona", persona());
        personaId = res.id;
        expect(res.version).toBe(1);

        const ws = await getDoc(doc(alice.db, "workspaces", alice.uid));
        expect(ws.data()?.ownerId).toBe(alice.uid);
        const member = await getDoc(doc(alice.db, "workspaces", alice.uid, "members", alice.uid));
        expect(member.data()?.role).toBe("owner");
        const p = await getDoc(doc(alice.db, "workspaces", alice.uid, "personas", personaId));
        expect(p.data()?.status).toBe("active");
        expect(p.data()?.research.sourceIds).toEqual([]);
        const logs = await getDocs(collection(alice.db, "workspaces", alice.uid, "auditLogs"));
        expect(logs.docs.map((d) => d.data().action)).toContain("persona.create");
    });

    it("rejects unauthenticated and invalid input", async () => {
        const anon = initializeApp({ projectId: PROJECT_ID, apiKey: "fake-api-key" }, "anon");
        const fns = getFunctions(anon);
        connectFunctionsEmulator(fns, "127.0.0.1", 5001);
        expect(await code(httpsCallable(fns, "createPersona")(persona()))).toBe("unauthenticated");
        await deleteApp(anon);

        // Asking for auto-publish on create is ignored: new personas always start with manual approval.
        const sneaky = { ...persona(), name: "Sneaky", publishing: { ...persona().publishing, approvalMode: "automatic" } };
        const created = await alice.call<{ id: string }>("createPersona", sneaky);
        const stored = await getDoc(doc(alice.db, "workspaces", alice.uid, "personas", created.id));
        expect(stored.data()?.publishing.approvalMode).toBe("manual");
        await alice.call("setPersonaStatus", { personaId: created.id, status: "archived" });
        await alice.call("deletePersona", { personaId: created.id });
        expect(await code(alice.call("createPersona", { ...persona(), workspaceId: bob.uid }))).toBe("invalid-argument");
    });

    it("updates with optimistic versioning", async () => {
        const updated = { ...persona(), name: "Renamed" };
        const res = await alice.call<{ version: number }>("updatePersona", { personaId, expectedVersion: 1, persona: updated });
        expect(res.version).toBe(2);
        expect(await code(alice.call("updatePersona", { personaId, expectedVersion: 1, persona: updated }))).toBe("aborted");
        const p = await getDoc(doc(alice.db, "workspaces", alice.uid, "personas", personaId));
        expect(p.data()?.name).toBe("Renamed");
    });

    it("another user cannot touch the persona (it lives in their own workspace path)", async () => {
        expect(await code(bob.call("updatePersona", { personaId, expectedVersion: 2, persona: persona() }))).toBe("not-found");
        expect(await code(bob.call("setPersonaStatus", { personaId, status: "archived" }))).toBe("not-found");
        expect(await code(getDoc(doc(bob.db, "workspaces", alice.uid, "personas", personaId)))).toBe("permission-denied");
        expect(await code(setDoc(doc(alice.db, "workspaces", alice.uid, "personas", personaId), { name: "hack" }))).toBe("permission-denied");
    });

    it("pauses, archives, blocks edits/deletes appropriately, then deletes", async () => {
        expect(await code(alice.call("deletePersona", { personaId }))).toBe("failed-precondition");
        await alice.call("setPersonaStatus", { personaId, status: "paused" });
        await alice.call("setPersonaStatus", { personaId, status: "archived" });
        expect(await code(alice.call("updatePersona", { personaId, expectedVersion: 2, persona: persona() }))).toBe("failed-precondition");
        await alice.call("deletePersona", { personaId });
        const p = await getDoc(doc(alice.db, "workspaces", alice.uid, "personas", personaId));
        expect(p.exists()).toBe(false);
    });

    it("enforces the per-workspace persona limit", async () => {
        for (let i = 0; i < 5; i++) await bob.call("createPersona", persona());
        expect(await code(bob.call("createPersona", persona()))).toBe("resource-exhausted");
    }, 60_000);

    it("toggles the kill switch", async () => {
        await alice.call("setAutopilotEnabled", { enabled: false });
        const s = await getDoc(doc(alice.db, "workspaces", alice.uid, "settings", "config"));
        expect(s.data()?.autopilotEnabled).toBe(false);
        await alice.call("setAutopilotEnabled", { enabled: true });
    });
});
