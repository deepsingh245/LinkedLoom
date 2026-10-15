import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import { classifyError, StopRun, CancelRun } from "../src/autopilot/research/errors";
import { followingStep } from "../src/autopilot/research/steps";
import { resumeStepFor } from "../src/autopilot/research/reaper";
import { isSchedulable } from "../src/autopilot/scheduling/schedule-index";
import { nextStepOf, STEP_ORDER, envNum } from "../src/autopilot/research/types";
import { groupDocs } from "../src/autopilot/research/pipeline";
import { personaInputSchema } from "../src/autopilot/schema";

describe("classifyError", () => {
    const err = (code: any, kind?: string) => new HttpsError(code, "x", kind ? { kind } : undefined);

    it("retries transient provider and infrastructure problems", () => {
        expect(classifyError(err("deadline-exceeded", "provider_timeout"))).toBe("retry");
        expect(classifyError(err("resource-exhausted", "provider_rate_limit"))).toBe("retry");
        expect(classifyError(err("internal", "provider_unavailable"))).toBe("retry");
        expect(classifyError(err("internal", "bad_output"))).toBe("retry");
        expect(classifyError(err("unavailable"))).toBe("retry");
        expect(classifyError(err("aborted"))).toBe("retry");
        expect(classifyError(new Error("ECONNRESET"))).toBe("retry");
        expect(classifyError("weird")).toBe("retry");
    });

    it("stops (partial result) when our own credit and usage limits are hit", () => {
        expect(classifyError(err("resource-exhausted"))).toBe("stop"); // not enough credits / monthly limit / daily cap
        expect(classifyError(new StopRun("AI call limit reached"))).toBe("stop");
    });

    it("fails immediately when retrying can't help", () => {
        expect(classifyError(err("failed-precondition"))).toBe("fail"); // e.g. BYOK key rejected, config missing
        expect(classifyError(err("invalid-argument"))).toBe("fail");
        expect(classifyError(err("not-found"))).toBe("fail");
        expect(classifyError(err("permission-denied"))).toBe("fail");
        expect(classifyError(err("internal"))).toBe("fail"); // internal without a transient marker
    });

    it("CancelRun is a plain error type distinct from StopRun", () => {
        expect(new CancelRun("x")).not.toBeInstanceOf(StopRun);
    });
});

describe("step order", () => {
    it("runs discover → … → store", () => {
        expect(STEP_ORDER).toEqual(["discover", "filter", "fetch", "extract", "generate", "verify", "store"]);
        expect(nextStepOf("discover")).toBe("filter");
        expect(nextStepOf("verify")).toBe("store");
        expect(nextStepOf("store")).toBeNull();
    });

    it("jumps to store after an early stop, and ends after store", () => {
        expect(followingStep("filter", false)).toBe("fetch");
        expect(followingStep("filter", true)).toBe("store");
        expect(followingStep("extract", true)).toBe("store");
        expect(followingStep("store", false)).toBeNull();
        expect(followingStep("store", true)).toBeNull();
    });

    it("the reaper resumes at the first unfinished step, or store when stopped early", () => {
        expect(resumeStepFor({ completedSteps: [] })).toBe("discover");
        expect(resumeStepFor({ completedSteps: ["discover", "filter"] })).toBe("fetch");
        expect(resumeStepFor({ completedSteps: ["discover", "filter", "fetch", "extract", "generate", "verify"] })).toBe("store");
        expect(resumeStepFor({ completedSteps: ["discover"], partial: true })).toBe("store");
        expect(resumeStepFor({})).toBe("discover");
    });
});

describe("isSchedulable", () => {
    const base = () => ({
        status: "active",
        research: { autoRun: true, feedUrls: ["https://a.com/feed"], webSearch: false },
        publishing: { postingWindows: [{ start: "09:00", end: "10:00" }] },
    });

    it("needs an active, opted-in persona with something to read and posting windows", () => {
        expect(isSchedulable(base())).toBe(true);
        expect(isSchedulable({ ...base(), research: { ...base().research, feedUrls: [], webSearch: true } })).toBe(true);
    });

    it("rejects everything else", () => {
        expect(isSchedulable(null)).toBe(false);
        expect(isSchedulable(undefined)).toBe(false);
        expect(isSchedulable({ ...base(), status: "paused" })).toBe(false);
        expect(isSchedulable({ ...base(), status: "archived" })).toBe(false);
        expect(isSchedulable({ ...base(), research: { ...base().research, autoRun: false } })).toBe(false);
        expect(isSchedulable({ ...base(), research: { autoRun: true, feedUrls: [], webSearch: false } })).toBe(false);
        expect(isSchedulable({ ...base(), publishing: { postingWindows: [] } })).toBe(false);
    });
});

describe("persona schema: autoRun", () => {
    const persona = (research: Record<string, unknown> = {}) => ({
        name: "P",
        identity: { role: "r", targetAudience: "a", tone: "technical", language: "English" },
        research: { topics: ["AI"], keywords: [], excludedTopics: [], feedUrls: [], freshnessHours: 48, minSourceCount: 2, ...research },
        publishing: { accountIds: ["linkedin"], postsPerDay: 1, timezone: "UTC", postingWindows: [{ start: "09:00", end: "10:00" }], approvalMode: "manual", allowImages: false },
        ai: { modelProfile: "balanced", monthlyCreditLimit: 100 },
    });

    it("defaults to off (and webSearch to off) so old personas keep working", () => {
        const out = personaInputSchema.parse(persona());
        expect(out.research.autoRun).toBe(false);
        expect(out.research.webSearch).toBe(false);
    });

    it("requires a feed or web search to turn automatic research on", () => {
        expect(personaInputSchema.safeParse(persona({ autoRun: true })).success).toBe(false);
        expect(personaInputSchema.safeParse(persona({ autoRun: true, feedUrls: ["https://a.com/f"] })).success).toBe(true);
        expect(personaInputSchema.safeParse(persona({ autoRun: true, webSearch: true })).success).toBe(true);
        const bad = personaInputSchema.safeParse(persona({ autoRun: true }));
        expect(bad.success ? "" : bad.error.issues[0].path.join(".")).toBe("research.autoRun");
    });
});

describe("envNum", () => {
    it("honours an explicit 0 and falls back on missing/invalid values", () => {
        process.env.TEST_ENV_NUM = "0";
        expect(envNum("TEST_ENV_NUM", 5)).toBe(0);
        process.env.TEST_ENV_NUM = "7";
        expect(envNum("TEST_ENV_NUM", 5)).toBe(7);
        process.env.TEST_ENV_NUM = "abc";
        expect(envNum("TEST_ENV_NUM", 5)).toBe(5);
        process.env.TEST_ENV_NUM = "";
        expect(envNum("TEST_ENV_NUM", 5)).toBe(5);
        delete process.env.TEST_ENV_NUM;
        expect(envNum("TEST_ENV_NUM", 5)).toBe(5);
    });
});

describe("groupDocs", () => {
    const doc = (id: string, domain: string, title: string, relevance: number) => ({ id, domain, title, relevance });

    it("builds groups of distinct sites, most related first, each article used once", () => {
        const docs = [
            doc("a", "x.com", "AI agents enter production", 0.9),
            doc("b", "y.com", "AI agents in production at banks", 0.8),
            doc("c", "z.com", "Developer tools for testing agents", 0.7),
            doc("d", "w.com", "Cooking with AI", 0.2),
        ];
        const groups = groupDocs(docs, 2, 3);
        expect(groups[0].map((d) => d.id)).toEqual(["a", "b"]);
        const used = groups.flat().map((d) => d.id);
        expect(new Set(used).size).toBe(used.length);
        for (const g of groups) expect(new Set(g.map((d) => d.domain)).size).toBe(g.length);
    });

    it("stops when there aren't enough distinct sites left, and respects the group cap", () => {
        const same = [doc("a", "x.com", "one", 1), doc("b", "x.com", "two", 0.9), doc("c", "x.com", "three", 0.8)];
        expect(groupDocs(same, 2, 3)).toEqual([]);
        const many = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id, i) => doc(id, `${id}.com`, `story ${id}`, 1 - i / 10));
        expect(groupDocs(many, 2, 3)).toHaveLength(3);
    });
});
