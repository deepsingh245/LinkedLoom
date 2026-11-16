// Firestore security rules tests. Run with the emulator:
//   npm run test:rules   (firebase emulators:exec --only firestore "vitest run test/rules.test.ts")
import { readFileSync } from "fs";
import { resolve } from "path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

const ALICE = "alice";
const BOB = "bob";

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-linkedloom-rules",
        firestore: {
            rules: readFileSync(resolve(__dirname, "../firestore.rules"), "utf8"),
            host: "127.0.0.1",
            port: 8080,
        },
    });
});

afterAll(async () => {
    await env?.cleanup();
});

beforeEach(async () => {
    await env.clearFirestore();
    // Seed data as the backend (Admin SDK equivalent: rules disabled).
    await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, "workspaces/alice"), { id: ALICE, ownerId: ALICE, type: "personal" });
        await setDoc(doc(db, "workspaces/alice/members/alice"), { uid: ALICE, role: "owner" });
        await setDoc(doc(db, "workspaces/alice/personas/p1"), { name: "Alice persona", status: "active", version: 1 });
        await setDoc(doc(db, "workspaces/alice/settings/config"), { autopilotEnabled: true });
        await setDoc(doc(db, "workspaces/alice/auditLogs/l1"), { action: "persona.create" });
        await setDoc(doc(db, "users/alice"), { name: "Alice" });
        await setDoc(doc(db, "users/alice/connections/linkedin"), { accessToken: "secret" });
        await setDoc(doc(db, "posts/post1"), { user_id: ALICE, content: "hi" });
    });
});

const asAlice = () => env.authenticatedContext(ALICE).firestore();
const asBob = () => env.authenticatedContext(BOB).firestore();
const asAnon = () => env.unauthenticatedContext().firestore();

describe("workspaces", () => {
    it("owner can read their workspace, personas, settings and audit logs", async () => {
        const db = asAlice();
        await assertSucceeds(getDoc(doc(db, "workspaces/alice")));
        await assertSucceeds(getDocs(collection(db, "workspaces/alice/personas")));
        await assertSucceeds(getDoc(doc(db, "workspaces/alice/personas/p1")));
        await assertSucceeds(getDoc(doc(db, "workspaces/alice/settings/config")));
        await assertSucceeds(getDocs(collection(db, "workspaces/alice/auditLogs")));
    });

    it("owner can list personas before the workspace doc exists (first visit)", async () => {
        await assertSucceeds(getDocs(collection(asBob(), "workspaces/bob/personas")));
    });

    it("another user cannot read someone else's workspace data", async () => {
        const db = asBob();
        await assertFails(getDoc(doc(db, "workspaces/alice")));
        await assertFails(getDocs(collection(db, "workspaces/alice/personas")));
        await assertFails(getDoc(doc(db, "workspaces/alice/personas/p1")));
        await assertFails(getDoc(doc(db, "workspaces/alice/settings/config")));
        await assertFails(getDocs(collection(db, "workspaces/alice/auditLogs")));
    });

    it("clients cannot write workspace data, even their own", async () => {
        const db = asAlice();
        await assertFails(setDoc(doc(db, "workspaces/alice/personas/p2"), { name: "x" }));
        await assertFails(updateDoc(doc(db, "workspaces/alice/personas/p1"), { status: "archived" }));
        await assertFails(deleteDoc(doc(db, "workspaces/alice/personas/p1")));
        await assertFails(setDoc(doc(db, "workspaces/alice/settings/config"), { autopilotEnabled: false }));
        await assertFails(setDoc(doc(db, "workspaces/alice/members/bob"), { uid: BOB, role: "owner" }));
        await assertFails(setDoc(doc(db, "workspaces/alice"), { ownerId: BOB }));
        await assertFails(setDoc(doc(asBob(), "workspaces/bob/personas/p1"), { name: "x" }));
    });

    it("unauthenticated users are denied", async () => {
        const db = asAnon();
        await assertFails(getDoc(doc(db, "workspaces/alice")));
        await assertFails(getDocs(collection(db, "workspaces/alice/personas")));
    });
});

describe("AI + billing collections", () => {
    const readable = [
        "aiConnections/c1", "creditWallets/main", "creditLedger/l1", "creditReservations/r1", "usageRecords/u1", "personaUsage/p1_202610",
        "workflowRuns/run1", "contentItems/content1", "researchItems/item1",
    ];

    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            for (const path of readable) await setDoc(doc(db, `workspaces/alice/${path}`), { x: 1 });
            await setDoc(doc(db, "workspaces/alice/aiConnectionSecrets/c1"), { secretRef: "projects/p/secrets/byok-alice-c1" });
            await setDoc(doc(db, "workspaces/alice/runLocks/p1"), { runId: "r1" });
            await setDoc(doc(db, "researchSchedule/alice__p1"), { workspaceId: "alice", personaId: "p1" });
            await setDoc(doc(db, "workspaces/alice/workflowRuns/run1/artifacts/docs"), { json: "[]" });
            await setDoc(doc(db, "_emulatorSecrets/byok-alice-c1"), { value: "sk-secret" });
        });
    });

    it("owner can read metadata but never write it", async () => {
        for (const path of readable) {
            await assertSucceeds(getDoc(doc(asAlice(), `workspaces/alice/${path}`)));
            await assertFails(setDoc(doc(asAlice(), `workspaces/alice/${path}`), { x: 2 }));
        }
    });

    it("other users can't read any of it", async () => {
        for (const path of readable) await assertFails(getDoc(doc(asBob(), `workspaces/alice/${path}`)));
    });

    it("key references and emulator secrets are denied to everyone, including the owner", async () => {
        await assertFails(getDoc(doc(asAlice(), "workspaces/alice/aiConnectionSecrets/c1")));
        await assertFails(getDocs(collection(asAlice(), "workspaces/alice/aiConnectionSecrets")));
        await assertFails(getDoc(doc(asAlice(), "workspaces/alice/runLocks/p1"))); // research run locks are server-only
        await assertFails(getDoc(doc(asAlice(), "researchSchedule/alice__p1"))); // the dispatcher's schedule index is server-only
        await assertFails(getDocs(collection(asAlice(), "researchSchedule")));
        await assertFails(getDoc(doc(asAlice(), "workspaces/alice/workflowRuns/run1/artifacts/docs"))); // temporary article text is server-only
        await assertFails(getDocs(collection(asAlice(), "workspaces/alice/workflowRuns/run1/artifacts")));
        await assertFails(setDoc(doc(asAlice(), "researchSchedule/alice__p9"), { nextRunAt: new Date(0) }));
        await assertFails(getDoc(doc(asAlice(), "_emulatorSecrets/byok-alice-c1")));
        await assertFails(getDoc(doc(asAnon(), "_emulatorSecrets/byok-alice-c1")));
    });
});

describe("existing rules still behave", () => {
    it("users: owner only, connections backend-only", async () => {
        await assertSucceeds(getDoc(doc(asAlice(), "users/alice")));
        await assertFails(getDoc(doc(asBob(), "users/alice")));
        await assertFails(getDoc(doc(asAlice(), "users/alice/connections/linkedin")));
    });

    it("posts: owner only", async () => {
        await assertSucceeds(getDoc(doc(asAlice(), "posts/post1")));
        await assertFails(getDoc(doc(asBob(), "posts/post1")));
        await assertSucceeds(setDoc(doc(asAlice(), "posts/post2"), { user_id: ALICE, content: "x" }));
        await assertFails(setDoc(doc(asBob(), "posts/post3"), { user_id: ALICE, content: "x" }));
    });

    it("context files: metadata readable by the owner, full text and writes denied", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await setDoc(doc(admin, "workspaces/alice/contextDocs/d1"), { name: "brand.md", enabled: true });
            await setDoc(doc(admin, "workspaces/alice/contextTexts/d1"), { text: "private company text" });
        });
        await assertSucceeds(getDoc(doc(asAlice(), "workspaces/alice/contextDocs/d1")));
        await assertFails(getDoc(doc(asBob(), "workspaces/alice/contextDocs/d1")));
        await assertFails(getDoc(doc(asAlice(), "workspaces/alice/contextTexts/d1")));
        await assertFails(setDoc(doc(asAlice(), "workspaces/alice/contextDocs/d2"), { name: "x.md" }));
    });

    it("posts: clients can draft and schedule but never set publish state (A5)", async () => {
        const db = asAlice();
        await assertSucceeds(setDoc(doc(db, "posts/d1"), { user_id: ALICE, content: "x", status: "DRAFT", platforms: ["linkedin"], linkedinUrn: "" }));
        await assertSucceeds(updateDoc(doc(db, "posts/d1"), { status: "SCHEDULED", scheduledFor: new Date(Date.now() + 3_600_000) }));
        // Server-only statuses and fields.
        await assertFails(setDoc(doc(db, "posts/d2"), { user_id: ALICE, content: "x", status: "PUBLISHED" }));
        await assertFails(updateDoc(doc(db, "posts/d1"), { status: "PUBLISHED" }));
        await assertFails(updateDoc(doc(db, "posts/d1"), { status: "PUBLISHING" }));
        await assertFails(updateDoc(doc(db, "posts/d1"), { results: { linkedin: { status: "published" } } }));
        await assertFails(updateDoc(doc(db, "posts/d1"), { linkedinUrn: "urn:li:share:1" }));
        await assertFails(setDoc(doc(db, "posts/d3"), { user_id: ALICE, content: "x", source: "autopilot", contentItemId: "c1" }));

        await env.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await setDoc(doc(admin, "posts/busy"), { user_id: ALICE, content: "x", status: "PUBLISHING" });
            await setDoc(doc(admin, "posts/done"), { user_id: ALICE, content: "x", status: "PUBLISHED" });
            await setDoc(doc(admin, "posts/auto"), { user_id: ALICE, content: "x", status: "SCHEDULED", source: "autopilot", contentItemId: "c1" });
        });
        // Being published: no edits, no delete. Published: read-only (delete allowed).
        await assertFails(updateDoc(doc(db, "posts/busy"), { content: "y" }));
        await assertFails(deleteDoc(doc(db, "posts/busy")));
        await assertFails(updateDoc(doc(db, "posts/done"), { content: "y" }));
        await assertSucceeds(deleteDoc(doc(db, "posts/done")));
        // Approved Autopilot post: text edits ok, (re)scheduling only through the callables.
        await assertSucceeds(updateDoc(doc(db, "posts/auto"), { content: "edited" }));
        await assertFails(updateDoc(doc(db, "posts/auto"), { status: "DRAFT" }));
        await assertFails(updateDoc(doc(db, "posts/auto"), { scheduledFor: new Date() }));
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "posts/missed"), { user_id: ALICE, content: "x", status: "MISSED", source: "autopilot", contentItemId: "c2" });
        });
        // A held-back Autopilot post is rescheduled through the callables too; republish markers are server-only.
        await assertFails(updateDoc(doc(db, "posts/missed"), { status: "SCHEDULED" }));
        await assertFails(updateDoc(doc(db, "posts/d1"), { republishedFrom: { linkedin: { id: "x" } } }));
    });

    it("publisher heartbeat: signed-in users read it, nobody writes it", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "system/publisher"), { lastRunAt: new Date() });
            await setDoc(doc(ctx.firestore(), "system/other"), { secret: true });
        });
        await assertSucceeds(getDoc(doc(asAlice(), "system/publisher")));
        await assertFails(getDoc(doc(asAnon(), "system/publisher")));
        await assertFails(getDoc(doc(asAlice(), "system/other")));
        await assertFails(setDoc(doc(asAlice(), "system/publisher"), { lastRunAt: new Date() }));
    });
});
