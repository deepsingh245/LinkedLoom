// End-to-end tests for the research pipeline in the emulators (mocked AI, local fixture web server).
// The functions emulator fetches fixtures through the real safe-fetch (RESEARCH_ALLOW_LOCALHOST is
// honoured only inside the emulator). Each scenario uses a fresh user so dedupe memory is isolated.
import * as http from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, setDoc, where } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-linkedloom-test";

// ---------------------------------------------------------------- fixture web server
// Distinct loopback hostnames = distinct "source domains" for the minSourceCount rule.
const HOSTS = ["127.0.0.1", "127.0.0.2", "127.0.0.3", "127.0.0.4"];
let server: http.Server;
let port: number;
const at = (host: string, path: string) => `http://${host}:${port}${path}`;

const paragraphs = (topic: string) =>
    [
        `${topic} is moving from experiments into real production systems across several large companies this quarter.`,
        "Engineering teams report that careful testing and human review remain essential before anything ships to customers.",
        "Analysts expect adoption to continue as tooling matures and the operational lessons are shared more widely online.",
        "Several vendors have also published guidance on monitoring costs and keeping humans in the loop for risky actions.",
    ];

const page = (title: string, body: string[] = paragraphs(title)) =>
    `<html><head><title>${title}</title><meta property="og:title" content="${title}"></head><body><nav>Home Pricing Docs Login Blog</nav>` +
    `<article><h1>${title}</h1>${body.map((p) => `<p>${p}</p>`).join("")}</article><footer>Copyright notice that must not be extracted anywhere</footer></body></html>`;

const ON_TOPIC = "A look at AI agents and developer tools for engineering teams.";
const ARTICLES: Record<string, { host: string; title: string; summary: string }> = {
    "/a1": { host: HOSTS[0], title: "AI agents enter production at large banks", summary: ON_TOPIC },
    "/a2": { host: HOSTS[1], title: "New developer tools make agent testing easier", summary: ON_TOPIC },
    "/a3": { host: HOSTS[2], title: "Open source agent frameworks gain more contributors", summary: ON_TOPIC },
    "/a4": { host: HOSTS[3], title: "Enterprises build guardrails around AI assistants", summary: ON_TOPIC },
    "/pasta": { host: HOSTS[0], title: "Cooking pasta at home for beginners", summary: "Simple recipes for dinner tonight." },
    "/crypto": { host: HOSTS[1], title: "Crypto prices surge as AI agents trade tokens", summary: "Markets moved sharply today." },
};

const rssItem = (path: string, a: { title: string; host: string; summary: string }) =>
    `<item><title>${a.title}</title><link>${at(a.host, path)}?utm_source=feed</link><pubDate>${new Date().toUTCString()}</pubDate><description>${a.summary}</description></item>`;

beforeAll(async () => {
    server = http.createServer((req, res) => {
        const url = new URL(req.url ?? "/", "http://x");
        if (url.pathname === "/feed.xml") {
            const items = Object.entries(ARTICLES).map(([p, a]) => rssItem(p, a)).join("");
            res.writeHead(200, { "content-type": "application/rss+xml" });
            return res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title>${items}</channel></rss>`);
        }
        const article = ARTICLES[url.pathname];
        if (article) {
            res.writeHead(200, { "content-type": "text/html" });
            return res.end(page(article.title));
        }
        res.writeHead(404, { "content-type": "text/html" });
        res.end("not found");
    });
    await new Promise<void>((resolve) => server.listen(0, "::", resolve));
    port = (server.address() as AddressInfo).port;
    if (!getAdminApps().length) initAdmin({ projectId: PROJECT_ID });
}, 60_000);

afterAll(async () => {
    server?.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ---------------------------------------------------------------- helpers
type Client = {
    app: FirebaseApp;
    uid: string;
    call: <T = any>(name: string, data?: unknown) => Promise<T>;
    db: ReturnType<typeof getFirestore>;
};
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
    return { app, uid: cred.user.uid, call, db };
}

afterAll(async () => {
    await Promise.all(apps.map((a) => deleteApp(a)));
});

const code = async (p: Promise<unknown>) => {
    try {
        await p;
        return "ok";
    } catch (e: any) {
        return String(e.code).replace("functions/", "");
    }
};

const adminDb = () => getAdminFirestore();

interface PersonaOpts {
    feedUrls?: string[];
    topics?: string[];
    excludedTopics?: string[];
    minSourceCount?: number;
    webSearch?: boolean;
    customInstructions?: string;
    status?: "active" | "paused" | "archived";
    connectionId?: string;
}

/** Seed a persona with the Admin SDK (the callable's schema only allows https feed URLs). */
async function seedPersona(uid: string, opts: PersonaOpts = {}): Promise<string> {
    await adminDb().doc(`workspaces/${uid}`).set({ id: uid, ownerId: uid, type: "personal" }, { merge: true });
    const ref = adminDb().collection(`workspaces/${uid}/personas`).doc();
    await ref.set({
        id: ref.id,
        workspaceId: uid,
        name: "Research tester",
        identity: {
            role: "Engineer", targetAudience: "Developers", tone: "technical", language: "English",
            ...(opts.customInstructions ? { customInstructions: opts.customInstructions } : {}),
        },
        research: {
            topics: opts.topics ?? ["AI agents", "developer tools"],
            keywords: ["agents"],
            excludedTopics: opts.excludedTopics ?? ["crypto"],
            feedUrls: opts.feedUrls ?? [at(HOSTS[0], "/feed.xml")],
            freshnessHours: 48,
            minSourceCount: opts.minSourceCount ?? 2,
            webSearch: opts.webSearch ?? false,
            sourceIds: [],
        },
        publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "UTC", postingWindows: [{ start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
        ai: { modelProfile: "balanced", monthlyCreditLimit: 1000, ...(opts.connectionId ? { connectionId: opts.connectionId } : {}) },
        status: opts.status ?? "active",
        version: 1,
        createdBy: uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    return ref.id;
}

const wallet = async (c: Client) => (await getDoc(doc(c.db, "workspaces", c.uid, "creditWallets", "main"))).data()!;
const contentItems = async (c: Client) => (await getDocs(collection(c.db, "workspaces", c.uid, "contentItems"))).docs.map((d) => d.data());

/** Fresh user with a seeded persona; makes sure the workspace/wallet exist first. */
async function setup(name: string, opts: PersonaOpts = {}) {
    const c = await client(name);
    await c.call("setAutopilotEnabled", { enabled: true }); // bootstraps workspace + trial credits
    const personaId = await seedPersona(c.uid, opts);
    return { c, personaId };
}

// ---------------------------------------------------------------- tests
describe("research run: happy path, dedupe, review actions", () => {
    let alice: Client;
    let personaId: string;
    let firstRun: any;

    it("finds, verifies and stores sourced drafts", async () => {
        ({ c: alice, personaId } = await setup("alice"));
        const startBalance = (await wallet(alice)).balance;
        firstRun = await alice.call("runResearch", { personaId });

        expect(firstRun.status).toBe("completed");
        expect(firstRun.drafts).toBe(2);
        expect(firstRun.stats).toMatchObject({ draftsAccepted: 2, feedsFetched: 1, fetched: 4 });
        expect(firstRun.stats.aiCalls).toBe(5); // 1 extract + 2 generate + 2 verify

        const items = await contentItems(alice);
        expect(items).toHaveLength(2);
        for (const item of items) {
            expect(item).toMatchObject({ state: "PENDING_APPROVAL", approvalStatus: "pending", personaId, version: 1 });
            expect(item.sources.length).toBeGreaterThanOrEqual(2);
            expect(new Set(item.sources.map((s: any) => s.domain)).size).toBeGreaterThanOrEqual(2);
            expect(item.sources.every((s: any) => s.quote.length > 10 && s.url.startsWith("http"))).toBe(true);
            expect(item.variants.linkedin.text).toBe(item.masterDraft);
            expect(item.qualityScore).toBeGreaterThan(0);
            expect(item.verification).toMatchObject({ deterministic: "passed", ai: "passed" });
            // Tracking params are kept in the stored URL only if the feed had them; the post must not contain prompt markers.
            expect(item.masterDraft).not.toMatch(/<<<|SOURCE id=/);
        }

        const run = (await getDoc(doc(alice.db, "workspaces", alice.uid, "workflowRuns", firstRun.runId))).data()!;
        expect(run.status).toBe("completed");
        expect(run.steps.map((s: any) => s.name)).toEqual(["discover", "filter", "fetch", "extract", "generate", "verify", "store"]);
        expect(run.steps.every((s: any) => s.status === "done")).toBe(true);
        expect(run.draftIds).toHaveLength(2);

        const usage = (await getDocs(collection(alice.db, "workspaces", alice.uid, "usageRecords"))).docs.map((d) => d.data());
        const features = usage.filter((u) => String(u.feature).startsWith("autopilot.research")).map((u) => u.feature).sort();
        expect(features).toEqual(["autopilot.research.extract", "autopilot.research.generate", "autopilot.research.generate", "autopilot.research.verify", "autopilot.research.verify"]);
        expect(usage.every((u) => u.status === "ok")).toBe(true);

        const w = await wallet(alice);
        expect(w.reserved).toBe(0);
        expect(w.balance).toBe(startBalance - firstRun.stats.credits);
        expect(firstRun.stats.credits).toBeGreaterThan(0);
    });

    it("only reads relevant, non-excluded articles and remembers what it read", async () => {
        const items = (await getDocs(collection(alice.db, "workspaces", alice.uid, "researchItems"))).docs.map((d) => d.data());
        const urls = items.map((i) => i.url as string);
        expect(urls.some((u) => u.includes("/pasta"))).toBe(false); // irrelevant → filtered before fetching
        expect(urls.some((u) => u.includes("/crypto"))).toBe(false); // excluded topic
        expect(items).toHaveLength(4);
        expect(items.every((i) => i.usedInContentId && i.expireAt && i.fingerprint)).toBe(true);
    });

    it("a second run finds nothing new and spends no credits", async () => {
        const before = (await wallet(alice)).balance;
        const second = await alice.call<any>("runResearch", { personaId });
        expect(second.status).toBe("completed");
        expect(second.drafts).toBe(0);
        expect(second.stats.aiCalls).toBe(0);
        expect(second.notes.join(" ")).toMatch(/new|relevant/i);
        expect((await wallet(alice)).balance).toBe(before);
        expect(await contentItems(alice)).toHaveLength(2);
    });

    it("lets the user edit, reject, restore and send a draft to their normal drafts", async () => {
        const [item] = await contentItems(alice);
        const id = item.id as string;

        expect(await code(alice.call("updateContentItem", { contentId: id, text: "too short" }))).toBe("invalid-argument");
        const edited = "My own wording: agents are entering production and careful human review still matters a great deal.";
        await alice.call("updateContentItem", { contentId: id, text: edited });
        const after = (await getDoc(doc(alice.db, "workspaces", alice.uid, "contentItems", id))).data()!;
        expect(after).toMatchObject({ edited: true, version: 2 });
        expect(after.variants.linkedin.text).toBe(edited);
        expect(after.masterDraft).not.toBe(edited); // original is preserved

        await alice.call("setContentStatus", { contentId: id, status: "rejected" });
        expect(await code(alice.call("exportContentToDraft", { contentId: id }))).toBe("failed-precondition");
        await alice.call("setContentStatus", { contentId: id, status: "pending" });

        const exported = await alice.call<{ postId: string }>("exportContentToDraft", { contentId: id });
        const again = await alice.call<{ postId: string }>("exportContentToDraft", { contentId: id });
        expect(again.postId).toBe(exported.postId);

        const post = (await getDoc(doc(alice.db, "posts", exported.postId))).data()!;
        expect(post).toMatchObject({ user_id: alice.uid, status: "DRAFT", source: "autopilot", contentItemId: id, imageUrl: null });
        expect(post.content).toContain(edited);
        expect(post.content).toMatch(/#AI/);
        expect(post.sourceUrls.length).toBeGreaterThanOrEqual(2);
        expect(post.scheduledFor).toBeUndefined(); // never scheduled automatically
        const mine = (await getDocs(query(collection(alice.db, "posts"), where("user_id", "==", alice.uid), where("contentItemId", "==", id)))).docs;
        expect(mine).toHaveLength(1);
    });

    it("isolates users: nobody else can read or act on these drafts and runs", async () => {
        const bob = await client("bob");
        const [item] = await contentItems(alice);
        expect(await code(getDoc(doc(bob.db, "workspaces", alice.uid, "contentItems", item.id)))).toBe("permission-denied");
        expect(await code(getDocs(collection(bob.db, "workspaces", alice.uid, "workflowRuns")))).toBe("permission-denied");
        expect(await code(getDocs(collection(bob.db, "workspaces", alice.uid, "researchItems")))).toBe("permission-denied");
        expect(await code(getDoc(doc(bob.db, "workspaces", alice.uid, "runLocks", personaId)))).toBe("permission-denied");
        expect(await code(setDoc(doc(alice.db, "workspaces", alice.uid, "contentItems", item.id), { masterDraft: "hacked" }))).toBe("permission-denied");
        // Callables resolve everything inside the caller's own workspace.
        expect(await code(bob.call("runResearch", { personaId }))).toBe("not-found");
        expect(await code(bob.call("updateContentItem", { contentId: item.id, text: "x".repeat(60) }))).toBe("not-found");
        expect(await code(bob.call("setContentStatus", { contentId: item.id, status: "rejected" }))).toBe("not-found");
        expect(await code(bob.call("exportContentToDraft", { contentId: item.id }))).toBe("not-found");
    });
});

describe("verification rejects untrustworthy drafts", () => {
    it("rejects a draft whose claim the fact-check can't support", async () => {
        const { c, personaId } = await setup("unsupported", { customInstructions: "[mock:unsupported]" });
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.drafts).toBe(0);
        expect(res.stats.draftsRejected).toBeGreaterThan(0);
        expect(await contentItems(c)).toHaveLength(0);
        const run = (await getDoc(doc(c.db, "workspaces", c.uid, "workflowRuns", res.runId))).data()!;
        expect(run.rejections[0].reasons.join(" ")).toMatch(/unsupported claim/i);
    });

    it("rejects a draft with a statistic that isn't in the sources, before spending on the AI check", async () => {
        const { c, personaId } = await setup("invent", { customInstructions: "[mock:invent-number]" });
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.drafts).toBe(0);
        const run = (await getDoc(doc(c.db, "workspaces", c.uid, "workflowRuns", res.runId))).data()!;
        expect(run.rejections.map((r: any) => r.reasons.join(" ")).join(" ")).toMatch(/73%/);
        expect(res.stats.aiCalls).toBe(3); // extract + 2 generate; deterministic failure skips the paid check
    });

    it("rejects a draft that leaks prompt markers", async () => {
        const { c, personaId } = await setup("leak", { customInstructions: "[mock:leak]" });
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.drafts).toBe(0);
        const run = (await getDoc(doc(c.db, "workspaces", c.uid, "workflowRuns", res.runId))).data()!;
        expect(run.rejections.map((r: any) => r.reasons.join(" ")).join(" ")).toMatch(/prompt markers/i);
    });

    it("writes nothing when there aren't enough distinct source sites", async () => {
        const { c, personaId } = await setup("fewsources", { minSourceCount: 5 });
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.drafts).toBe(0);
        expect(res.stats.aiCalls).toBe(0);
        expect(res.notes.join(" ")).toMatch(/distinct source/i);
    });
});

describe("web search (Gemini grounding)", () => {
    it("adds grounded sources, meters the search surcharge and still verifies drafts", async () => {
        const { c, personaId } = await setup("grounded", {
            feedUrls: [],
            webSearch: true,
            topics: [`AI agents [mock:url=${at(HOSTS[0], "/a1")}] [mock:url=${at(HOSTS[1], "/a2")}]`],
        });
        const start = (await wallet(c)).balance;
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.status).toBe("completed");
        expect(res.drafts).toBe(1);

        const usage = (await getDocs(collection(c.db, "workspaces", c.uid, "usageRecords"))).docs.map((d) => d.data());
        const search = usage.find((u) => u.feature === "autopilot.research.search")!;
        expect(search).toMatchObject({ provider: "gemini", billingMode: "managed", status: "ok" });
        expect(search.costMicroUsd).toBeGreaterThanOrEqual(35_000); // per-query grounding surcharge
        expect(search.credits).toBeGreaterThanOrEqual(5);
        expect((await wallet(c)).balance).toBe(start - res.stats.credits);
    });

    it("skips web search for OpenAI-billed personas and still uses feeds", async () => {
        const c = await client("openaiuser");
        await c.call("setAutopilotEnabled", { enabled: true });
        const conn = await c.call<{ id: string }>("addAIConnection", { provider: "openai", label: "mine", apiKey: "test-valid-key-1234567" });
        const personaId = await seedPersona(c.uid, { webSearch: true, connectionId: conn.id });
        const start = (await wallet(c)).balance;
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.status).toBe("completed");
        expect(res.notes.join(" ")).toMatch(/needs Gemini/i);
        expect(res.drafts).toBe(2);
        expect((await wallet(c)).balance).toBe(start); // BYOK: no credits used
        const usage = (await getDocs(collection(c.db, "workspaces", c.uid, "usageRecords"))).docs.map((d) => d.data());
        expect(usage.some((u) => u.feature === "autopilot.research.search")).toBe(false);
        expect(usage.filter((u) => String(u.feature).startsWith("autopilot.research")).every((u) => u.billingMode === "byok" && u.provider === "openai")).toBe(true);
    });
});

describe("guards", () => {
    it("stops cleanly when the workspace is out of credits", async () => {
        const { c, personaId } = await setup("broke");
        await adminDb().doc(`workspaces/${c.uid}/creditWallets/main`).update({ balance: 0 });
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.status).toBe("partial");
        expect(res.drafts).toBe(0);
        expect(res.notes.join(" ")).toMatch(/not enough ai credits/i);
        expect(await wallet(c)).toMatchObject({ balance: 0, reserved: 0 });
        const run = (await getDoc(doc(c.db, "workspaces", c.uid, "workflowRuns", res.runId))).data()!;
        expect(run.status).toBe("partial");
    });

    it("blocks a run while another is in progress, keeps that lock, and ignores a stale one", async () => {
        // (The Functions emulator handles calls one at a time, so the lock is exercised with a seeded lock.)
        const { c, personaId } = await setup("locked");
        const lockRef = adminDb().doc(`workspaces/${c.uid}/runLocks/${personaId}`);

        await lockRef.set({ runId: "someone-else", leaseExpiresAt: Timestamp.fromMillis(Date.now() + 5 * 60_000) });
        let message = "";
        try {
            await c.call("runResearch", { personaId });
        } catch (e: any) {
            message = `${e.code} ${e.message}`;
        }
        expect(message).toMatch(/failed-precondition.*already in progress/i);
        // The failed attempt must not release or steal the other run's lock, nor leave a run behind.
        expect((await lockRef.get()).data()?.runId).toBe("someone-else");
        expect((await getDocs(collection(c.db, "workspaces", c.uid, "workflowRuns"))).size).toBe(0);

        // A crashed run's lease expires, so it can't block the persona forever.
        await lockRef.set({ runId: "crashed", leaseExpiresAt: Timestamp.fromMillis(Date.now() - 60_000) });
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.status).toBe("completed");
        expect((await lockRef.get()).exists).toBe(false); // released at the end of the run
    });

    it("refuses archived, paused and kill-switched personas and personas with nothing to read", async () => {
        const archived = await setup("archived", { status: "archived" });
        expect(await code(archived.c.call("runResearch", { personaId: archived.personaId }))).toBe("failed-precondition");

        const paused = await setup("paused", { status: "paused" });
        expect(await code(paused.c.call("runResearch", { personaId: paused.personaId }))).toBe("failed-precondition");

        const killed = await setup("killed");
        await killed.c.call("setAutopilotEnabled", { enabled: false });
        expect(await code(killed.c.call("runResearch", { personaId: killed.personaId }))).toBe("failed-precondition");

        const empty = await setup("empty", { feedUrls: [], webSearch: false });
        expect(await code(empty.c.call("runResearch", { personaId: empty.personaId }))).toBe("failed-precondition");

        expect(await code(killed.c.call("runResearch", { personaId: "does-not-exist" }))).toBe("failed-precondition"); // kill switch checked first
        const ok = await setup("missing");
        expect(await code(ok.c.call("runResearch", { personaId: "does-not-exist" }))).toBe("not-found");
        expect(await code(ok.c.call("runResearch", { personaId: "../bad" }))).toBe("invalid-argument");
    });

    it("reports unreachable feeds without failing the run", async () => {
        const { c, personaId } = await setup("badfeed", {
            feedUrls: [at(HOSTS[0], "/missing.xml"), "https://169.254.169.254/latest/meta-data/", at(HOSTS[0], "/feed.xml")],
        });
        const res = await c.call<any>("runResearch", { personaId });
        expect(res.status).toBe("completed");
        expect(res.stats).toMatchObject({ feedsFetched: 1, feedsFailed: 2 }); // 404 and the blocked metadata URL fail, the good feed works
        expect(res.notes.join(" ")).toMatch(/Feed skipped/);
        expect(res.drafts).toBe(2);
    });

    it("enforces the daily research-run cap", async () => {
        const { c, personaId } = await setup("capped", { feedUrls: [at(HOSTS[0], "/missing.xml")] });
        for (let i = 0; i < 4; i++) await c.call("runResearch", { personaId });
        expect(await code(c.call("runResearch", { personaId }))).toBe("resource-exhausted");
    });
});
