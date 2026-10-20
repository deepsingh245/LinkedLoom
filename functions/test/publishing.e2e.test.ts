// A5 through the real emulators: approve → scheduled post in the next free slot, reschedule, unschedule,
// auto-publish opt-in, publish-check answers and the authenticated LinkedIn endpoints. No LinkedIn calls:
// LinkedIn connections are seeded, and nothing here is due for publishing.
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-linkedloom-test";
const adminDb = () => getAdminFirestore();
const FUNCTIONS_URL = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1`;

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
    const cred = await createUserWithEmailAndPassword(auth, `${name}-${randomUUID().slice(0, 8)}@test.dev`, "password123");
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

beforeAll(() => {
    if (!getAdminApps().length) initAdmin({ projectId: PROJECT_ID });
});

afterAll(async () => {
    await Promise.all(apps.map((a) => deleteApp(a).catch(() => undefined)));
});

/** Workspace + persona (UTC, one 09:00–10:00 window) + one researched draft, optionally LinkedIn connected. */
async function setup(c: Client, opts: { linkedin?: boolean; demo?: boolean; window?: { start: string; end: string } } = {}) {
    // ensureWorkspace via a harmless callable creates the workspace and settings.
    await c.call("setAutopilotEnabled", { enabled: true });
    const persona = adminDb().collection(`workspaces/${c.uid}/personas`).doc();
    await persona.set({
        id: persona.id, workspaceId: c.uid, name: "Publisher", status: "active", version: 1,
        identity: { role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English" },
        research: { topics: ["AI"], keywords: [], excludedTopics: [], feedUrls: [], freshnessHours: 48, minSourceCount: 1, webSearch: false, autoRun: false, sourceIds: [] },
        publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "UTC", postingWindows: [opts.window ?? { start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
        ai: { modelProfile: "balanced", monthlyCreditLimit: 1000 },
    });
    const contentId = `c_${randomUUID().slice(0, 8)}`;
    await adminDb().doc(`workspaces/${c.uid}/contentItems/${contentId}`).set({
        id: contentId, personaId: persona.id, runId: "r1", topic: "AI agents", masterDraft: "x",
        hashtags: ["AI"], variants: { linkedin: { text: "A sourced post about AI agents that is long enough to be valid here.", status: "draft" } },
        sources: [{ url: "https://example.com/a", title: "A", domain: "example.com", quote: "q" }], claims: [],
        qualityScore: 90, state: "PENDING_APPROVAL", approvalStatus: "pending", version: 1, createdAt: Timestamp.now(),
        ...(opts.demo ? { demo: true } : {}),
    });
    if (opts.linkedin !== false) {
        await adminDb().doc(`users/${c.uid}/connections/linkedin`).set({ provider: "linkedin", providerUserId: "abc", accessToken: "token", expiresAt: new Date(Date.now() + 30 * 86_400_000) });
    }
    return { personaId: persona.id, contentId };
}

const post = (contentId: string) => adminDb().doc(`posts/autopilot_${contentId}`);

describe("approve & schedule", () => {
    it("schedules into the next free slot, then reschedules and unschedules", async () => {
        const c = await client("approve");
        const { personaId, contentId } = await setup(c);

        const preview = await c.call<any>("previewApproval", { contentId });
        expect(preview).toMatchObject({ linkedinConnected: true, timezone: "UTC", blocker: null });
        expect(new Date(preview.suggestedAt).getUTCHours()).toBe(9);

        const approved = await c.call<any>("approveContent", { contentId });
        expect(approved.postId).toBe(`autopilot_${contentId}`);
        const p = (await post(contentId).get()).data()!;
        expect(p).toMatchObject({ user_id: c.uid, status: "SCHEDULED", platforms: ["linkedin"], source: "autopilot", contentItemId: contentId, personaId, approvedBy: "user" });
        expect(p.content).toContain("#AI");
        expect(p.scheduledFor.toDate().toISOString()).toBe(approved.scheduledFor);
        const item = (await getDoc(doc(c.db, "workspaces", c.uid, "contentItems", contentId))).data()!;
        expect(item).toMatchObject({ approvalStatus: "approved", state: "SCHEDULED", scheduledPostId: `autopilot_${contentId}` });

        // A second draft of the same persona gets the next day's slot (one post per window/day).
        const second = `c2_${randomUUID().slice(0, 6)}`;
        const seed = (await adminDb().doc(`workspaces/${c.uid}/contentItems/${contentId}`).get()).data()!;
        await adminDb().doc(`workspaces/${c.uid}/contentItems/${second}`).set({ ...seed, id: second, approvalStatus: "pending", state: "PENDING_APPROVAL" });
        const next = await c.call<any>("approveContent", { contentId: second });
        expect(new Date(next.scheduledFor).getTime() - new Date(approved.scheduledFor).getTime()).toBeGreaterThanOrEqual(23 * 3_600_000);

        // Reschedule to an exact time.
        const at = new Date(Date.now() + 3 * 86_400_000);
        at.setUTCSeconds(0, 0);
        const moved = await c.call<any>("approveContent", { contentId, scheduledFor: at.toISOString() });
        expect(moved.rescheduled).toBe(true);
        expect((await post(contentId).get()).data()!.scheduledFor.toDate().toISOString()).toBe(at.toISOString());

        // Rejecting a scheduled draft is refused; unscheduling puts it back in review.
        expect(await code(c.call("setContentStatus", { contentId, status: "rejected" }))).toBe("failed-precondition");
        await c.call("unscheduleContent", { contentId });
        expect((await post(contentId).get()).data()).toMatchObject({ status: "DRAFT", scheduledFor: null });
        expect((await getDoc(doc(c.db, "workspaces", c.uid, "contentItems", contentId))).data()).toMatchObject({ approvalStatus: "pending", state: "PENDING_APPROVAL" });
    });

    it("editing a scheduled draft updates the scheduled post", async () => {
        const c = await client("edit");
        const { contentId } = await setup(c);
        await c.call("approveContent", { contentId });
        const text = "Edited text for the scheduled post, still long enough to pass validation.";
        await c.call("updateContentItem", { contentId, text });
        expect((await post(contentId).get()).data()!.content).toBe(`${text}\n\n#AI`);
    });

    it("refuses demo drafts, past times, missing LinkedIn and a stopped Autopilot", async () => {
        const c = await client("refuse");
        const demo = await setup(c, { demo: true });
        expect(await code(c.call("approveContent", { contentId: demo.contentId }))).toBe("failed-precondition");

        const { contentId } = await setup(c);
        expect(await code(c.call("approveContent", { contentId, scheduledFor: new Date(Date.now() - 60_000).toISOString() }))).toBe("invalid-argument");
        expect(await code(c.call("approveContent", { contentId, scheduledFor: new Date(Date.now() + 90 * 86_400_000).toISOString() }))).toBe("invalid-argument");

        await c.call("setAutopilotEnabled", { enabled: false });
        expect(await code(c.call("approveContent", { contentId }))).toBe("failed-precondition");
        await c.call("setAutopilotEnabled", { enabled: true });

        const noLinkedIn = await client("nolinkedin");
        const s = await setup(noLinkedIn, { linkedin: false });
        expect(await code(noLinkedIn.call("approveContent", { contentId: s.contentId }))).toBe("failed-precondition");
        expect((await noLinkedIn.call<any>("previewApproval", { contentId: s.contentId })).blocker).toMatch(/Connect LinkedIn/);
    });

    it("nobody can approve someone else's draft", async () => {
        const alice = await client("alice");
        const bob = await client("bob");
        const { contentId } = await setup(alice);
        // Bob's workspace has no such draft.
        expect(await code(bob.call("approveContent", { contentId }))).toBe("not-found");
    });

    it("clients can't reschedule an approved Autopilot post directly, only through the callables", async () => {
        const c = await client("rules");
        const { contentId } = await setup(c);
        await c.call("approveContent", { contentId });
        expect(await code(updateDoc(doc(c.db, "posts", `autopilot_${contentId}`), { status: "DRAFT" }))).toBe("permission-denied");
        expect(await code(updateDoc(doc(c.db, "posts", `autopilot_${contentId}`), { status: "PUBLISHED" }))).toBe("permission-denied");
    });
});

describe("auto-publish opt-in", () => {
    it("needs confirmation and LinkedIn, and editing the persona never switches it", async () => {
        const c = await client("mode");
        const { personaId } = await setup(c);
        expect(await code(c.call("setPersonaApprovalMode", { personaId, mode: "automatic" }))).toBe("invalid-argument");
        const on = await c.call<any>("setPersonaApprovalMode", { personaId, mode: "automatic", acknowledge: true });
        expect(on.approvalMode).toBe("automatic");
        const persona = (await adminDb().doc(`workspaces/${c.uid}/personas/${personaId}`).get()).data()!;
        expect(persona.publishing.approvalMode).toBe("automatic");

        // A normal edit keeps "automatic" even when the form says "manual"…
        const { id, workspaceId, status, version, createdBy, createdAt, updatedAt, ...input } = persona as any;
        void id; void workspaceId; void status; void createdBy; void createdAt; void updatedAt;
        const { sourceIds, ...research } = input.research;
        void sourceIds;
        await c.call("updatePersona", { personaId, expectedVersion: version, persona: { ...input, research, publishing: { ...input.publishing, approvalMode: "manual" } } });
        expect((await adminDb().doc(`workspaces/${c.uid}/personas/${personaId}`).get()).data()!.publishing.approvalMode).toBe("automatic");

        await c.call("setPersonaApprovalMode", { personaId, mode: "manual" });
        expect((await adminDb().doc(`workspaces/${c.uid}/personas/${personaId}`).get()).data()!.publishing.approvalMode).toBe("manual");

        const noLinkedIn = await client("mode-nolinkedin");
        const s = await setup(noLinkedIn, { linkedin: false });
        expect(await code(noLinkedIn.call("setPersonaApprovalMode", { personaId: s.personaId, mode: "automatic", acknowledge: true }))).toBe("failed-precondition");
    });
});

describe("publish checks", () => {
    it("the user resolves a post we couldn't confirm", async () => {
        const c = await client("resolve");
        const { contentId } = await setup(c);
        await c.call("approveContent", { contentId });
        await post(contentId).update({ status: "RECONCILIATION_REQUIRED", results: { linkedin: { status: "unknown" } }, error: "No reply from LinkedIn." });

        const out = await c.call<any>("resolvePublishCheck", { postId: `autopilot_${contentId}`, outcome: "published" });
        expect(out.status).toBe("PUBLISHED");
        expect((await post(contentId).get()).data()).toMatchObject({ status: "PUBLISHED", resolvedBy: "user" });
        expect((await getDoc(doc(c.db, "workspaces", c.uid, "contentItems", contentId))).data()!.state).toBe("PUBLISHED");

        // Only posts that need a check.
        expect(await code(c.call("resolvePublishCheck", { postId: `autopilot_${contentId}`, outcome: "failed" }))).toBe("failed-precondition");
        const bob = await client("bob-resolve");
        expect(await code(bob.call("resolvePublishCheck", { postId: `autopilot_${contentId}`, outcome: "published" }))).toBe("not-found");
    });
});

describe("LinkedIn HTTP endpoints require a Firebase ID token", () => {
    it("rejects missing and forged tokens, ignores body userId", async () => {
        const noToken = await fetch(`${FUNCTIONS_URL}/publishToLinkedIn`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "someone", content: "hi" }),
        });
        expect(noToken.status).toBe(401);
        const forged = await fetch(`${FUNCTIONS_URL}/getLinkedInAnalytics`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer not-a-token" }, body: JSON.stringify({ userId: "someone" }),
        });
        expect(forged.status).toBe(401);

        // A real user without a LinkedIn connection gets a clear 412, not someone else's data.
        const c = await client("http");
        const token = await c.auth.currentUser!.getIdToken();
        const res = await fetch(`${FUNCTIONS_URL}/publishToLinkedIn`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: "victim", content: "hi" }),
        });
        expect(res.status).toBe(412);
    });
});
