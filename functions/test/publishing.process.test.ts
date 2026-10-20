// A5 publisher behaviour, driven in-process against the Firestore emulator with fake social publishers
// (no LinkedIn calls). Covers the exactly-once guarantees: claim, per-platform results, retry rules,
// ambiguous outcomes and lease recovery.
import { randomUUID } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.FUNCTIONS_EMULATOR = "true";

import { MAX_PUBLISH_ATTEMPTS, publishPost, recoverExpiredLeases, runPublishSweep, type PublishDeps } from "../src/publishing/publish-post";
import { PublishError, type PublishPlatform, type SocialPublisher } from "../src/publishing/types";

const db = () => getFirestore();

beforeAll(() => {
    if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-linkedloom-test" });
});

type Behaviour = "ok" | PublishError["kind"] | (() => Promise<void>);

/** A fake network: plays the given behaviours in order (the last one repeats) and counts calls. */
function fake(platform: PublishPlatform, ...behaviours: Behaviour[]) {
    const calls: string[] = [];
    const publisher: SocialPublisher = {
        platform,
        async publish({ post }) {
            const b = behaviours[Math.min(calls.length, behaviours.length - 1)];
            calls.push(String(post.content));
            if (typeof b === "function") await b();
            else if (b !== "ok") throw new PublishError(b, `${platform} ${b}`);
            return { id: `urn:li:share:${calls.length}`, url: `https://example.test/${platform}/${calls.length}` };
        },
    };
    return { publisher, calls };
}

const connected = (...platforms: PublishPlatform[]): PublishDeps["loadConnection"] =>
    async (_uid, p) => (platforms.includes(p) ? { accessToken: "t", providerUserId: "u" } : null);

async function seedPost(extra: Record<string, unknown> = {}) {
    const uid = `pub-${randomUUID().slice(0, 10)}`;
    const ref = db().collection("posts").doc();
    await ref.set({
        user_id: uid,
        content: "Hello LinkedIn",
        status: "SCHEDULED",
        platforms: ["linkedin"],
        scheduledFor: Timestamp.fromMillis(Date.now() - 60_000),
        ...extra,
    });
    return { uid, ref };
}

const read = async (ref: FirebaseFirestore.DocumentReference) => (await ref.get()).data()!;

describe("publishPost", () => {
    it("publishes once even when two workers race for the same post", async () => {
        const { ref } = await seedPost();
        const li = fake("linkedin", async () => new Promise((r) => setTimeout(r, 200)));
        const deps: PublishDeps = { publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin") };

        const [a, b] = await Promise.all([publishPost(ref.id, deps), publishPost(ref.id, deps)]);
        expect(li.calls).toHaveLength(1);
        expect([a.status, b.status].sort()).toEqual(["PUBLISHED", "skipped"]);
        const post = await read(ref);
        expect(post).toMatchObject({ status: "PUBLISHED", linkedinUrn: "urn:li:share:1", attempts: 1 });
        expect(post.results.linkedin.status).toBe("published");
        expect(post.publishLease).toBeUndefined();
        expect(post.publishedAt).toBeDefined();

        // Already published: another sweep does nothing.
        expect((await publishPost(ref.id, deps)).status).toBe("skipped");
        expect(li.calls).toHaveLength(1);
    });

    it("does not publish posts that aren't due yet (unless forced)", async () => {
        const { ref } = await seedPost({ scheduledFor: Timestamp.fromMillis(Date.now() + 3_600_000) });
        const li = fake("linkedin", "ok");
        const deps: PublishDeps = { publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin") };
        expect((await publishPost(ref.id, deps)).status).toBe("skipped");
        expect(li.calls).toHaveLength(0);
        expect((await publishPost(ref.id, deps, { force: true })).status).toBe("PUBLISHED");
    });

    it("ambiguous failure → RECONCILIATION_REQUIRED, never retried automatically", async () => {
        const { ref } = await seedPost();
        const li = fake("linkedin", "ambiguous");
        const deps: PublishDeps = { publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin") };

        expect((await publishPost(ref.id, deps)).status).toBe("RECONCILIATION_REQUIRED");
        const post = await read(ref);
        expect(post.results.linkedin.status).toBe("unknown");
        expect(post.error).toMatch(/Check your feed/);
        expect(post.nextAttemptAt).toBeUndefined();

        // The sweep doesn't pick it up again.
        expect((await publishPost(ref.id, deps)).status).toBe("skipped");
        expect(li.calls).toHaveLength(1);
    });

    it("temporary failure → RETRY_PENDING with backoff, then succeeds on the next due attempt", async () => {
        const { ref } = await seedPost();
        const li = fake("linkedin", "transient", "ok");
        const deps: PublishDeps = { publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin") };

        expect((await publishPost(ref.id, deps)).status).toBe("RETRY_PENDING");
        const waiting = await read(ref);
        expect(waiting.nextAttemptAt.toMillis()).toBeGreaterThan(Date.now() + 4 * 60_000);

        // Not due yet.
        expect((await publishPost(ref.id, deps)).status).toBe("skipped");
        // Later: due.
        const later: PublishDeps = { ...deps, now: () => new Date(Date.now() + 6 * 60_000) };
        expect((await publishPost(ref.id, later)).status).toBe("PUBLISHED");
        expect(await read(ref)).toMatchObject({ status: "PUBLISHED", attempts: 2 });
        expect(li.calls).toHaveLength(2);
    });

    it("gives up after the maximum attempts", async () => {
        const { ref } = await seedPost();
        const li = fake("linkedin", "transient");
        let clock = Date.now();
        const deps: PublishDeps = { publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin"), now: () => new Date(clock) };
        for (let i = 1; i < MAX_PUBLISH_ATTEMPTS; i++) {
            expect((await publishPost(ref.id, deps)).status).toBe("RETRY_PENDING");
            clock += 2 * 3_600_000;
        }
        expect((await publishPost(ref.id, deps)).status).toBe("FAILED");
        expect(li.calls).toHaveLength(MAX_PUBLISH_ATTEMPTS);
    });

    it("auth and definite errors fail right away with a readable reason", async () => {
        const { ref } = await seedPost();
        const li = fake("linkedin", "auth");
        const out = await publishPost(ref.id, { publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin") });
        expect(out.status).toBe("FAILED");
        expect((await read(ref)).error).toContain("linkedin auth");

        const { ref: noConn } = await seedPost();
        expect((await publishPost(noConn.id, { publishers: { linkedin: li.publisher }, loadConnection: connected() })).status).toBe("FAILED");
        expect((await read(noConn)).error).toMatch(/Connect/);
    });

    it("multi-platform: keeps successful platforms and never re-posts them", async () => {
        const { ref } = await seedPost({ platforms: ["linkedin", "reddit"] });
        const li = fake("linkedin", "ok");
        const rd = fake("reddit", "definite", "ok");
        const deps: PublishDeps = { publishers: { linkedin: li.publisher, reddit: rd.publisher }, loadConnection: connected("linkedin", "reddit") };

        expect((await publishPost(ref.id, deps)).status).toBe("PARTIAL");
        // The user schedules it again: only Reddit is attempted.
        await ref.update({ status: "SCHEDULED", scheduledFor: Timestamp.fromMillis(Date.now() - 1000) });
        expect((await publishPost(ref.id, deps)).status).toBe("PUBLISHED");
        expect(li.calls).toHaveLength(1);
        expect(rd.calls).toHaveLength(2);
    });

    it("legacy posts without `platforms` go to every connected network", async () => {
        const { ref } = await seedPost({ platforms: null, status: "SCHEDULED" });
        const li = fake("linkedin", "ok");
        const rd = fake("reddit", "ok");
        await publishPost(ref.id, { publishers: { linkedin: li.publisher, reddit: rd.publisher }, loadConnection: connected("linkedin") });
        expect(li.calls).toHaveLength(1);
        expect(rd.calls).toHaveLength(0);
    });

    it("mirrors the outcome onto the Autopilot content item", async () => {
        const uid = `pub-${randomUUID().slice(0, 10)}`;
        const content = db().doc(`workspaces/${uid}/contentItems/c1`);
        await content.set({ approvalStatus: "approved", state: "SCHEDULED" });
        const { ref } = await seedPost({ user_id: uid, workspaceId: uid, source: "autopilot", contentItemId: "c1" });
        const li = fake("linkedin", "ok");
        await publishPost(ref.id, { publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin") });
        expect((await content.get()).data()).toMatchObject({ state: "PUBLISHED", publishedUrl: "https://example.test/linkedin/1" });
    });
});

describe("sweep and recovery", () => {
    it("a post whose worker died mid-publish needs the user's check (not a blind retry)", async () => {
        const { ref } = await seedPost({ status: "PUBLISHING", publishLease: { id: "dead", until: Timestamp.fromMillis(Date.now() - 1000) } });
        expect(await recoverExpiredLeases()).toBeGreaterThanOrEqual(1);
        expect(await read(ref)).toMatchObject({ status: "RECONCILIATION_REQUIRED" });

        // ...unless every platform had already reported success.
        const { ref: done } = await seedPost({
            status: "PUBLISHING",
            publishLease: { id: "dead", until: Timestamp.fromMillis(Date.now() - 1000) },
            results: { linkedin: { status: "published", id: "urn:li:share:9" } },
        });
        await recoverExpiredLeases();
        expect((await read(done)).status).toBe("PUBLISHED");
    });

    it("a live lease is left alone", async () => {
        const { ref } = await seedPost({ status: "PUBLISHING", publishLease: { id: "live", until: Timestamp.fromMillis(Date.now() + 60_000) } });
        await recoverExpiredLeases();
        expect((await read(ref)).status).toBe("PUBLISHING");
    });

    it("runPublishSweep publishes due scheduled and retry posts", async () => {
        const { ref: a } = await seedPost();
        const { ref: b } = await seedPost({ status: "RETRY_PENDING", nextAttemptAt: Timestamp.fromMillis(Date.now() - 1000), attempts: 1 });
        const li = fake("linkedin", "ok");
        await runPublishSweep({ publishers: { linkedin: li.publisher }, loadConnection: connected("linkedin") });
        expect((await read(a)).status).toBe("PUBLISHED");
        expect((await read(b)).status).toBe("PUBLISHED");
    });
});
