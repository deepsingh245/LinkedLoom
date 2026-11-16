import { describe, expect, it } from "vitest";
import { personaInputSchema, updatePersonaSchema, setPersonaStatusSchema, isValidTimeZone } from "../src/autopilot/schema";
import { PERSONA_LIMITS } from "../src/autopilot/limits";

const valid = () => ({
    name: "AI & Technology Expert",
    description: "Researches AI releases",
    identity: {
        role: "Senior software engineer",
        targetAudience: "Developers",
        tone: "technical" as const,
        language: "English",
        customInstructions: "Be concise.",
    },
    research: {
        topics: ["AI releases", "developer tools"],
        keywords: ["LLM"],
        excludedTopics: ["crypto"],
        feedUrls: ["https://example.com/feed.xml"],
        freshnessHours: 48,
        minSourceCount: 2,
    },
    publishing: {
        accountIds: ["linkedin" as const],
        postsPerDay: 2,
        timezone: "Asia/Kolkata",
        postingWindows: [{ start: "09:00", end: "11:00" }, { start: "17:00", end: "18:30" }],
        approvalMode: "manual" as const,
        allowImages: false,
    },
    ai: { modelProfile: "balanced" as const, monthlyCreditLimit: 1000 },
});

const fails = (mutate: (p: any) => void) => {
    const p: any = valid();
    mutate(p);
    return !personaInputSchema.safeParse(p).success;
};

describe("personaInputSchema", () => {
    it("accepts a valid persona", () => {
        expect(personaInputSchema.safeParse(valid()).success).toBe(true);
    });

    it("dedupes tags and feed URLs", () => {
        const p: any = valid();
        p.research.topics = ["AI", "AI", "Tools"];
        p.research.feedUrls = ["https://a.com/f", "https://a.com/f"];
        const out = personaInputSchema.parse(p);
        expect(out.research.topics).toEqual(["AI", "Tools"]);
        expect(out.research.feedUrls).toEqual(["https://a.com/f"]);
    });

    it("trims strings", () => {
        const p: any = valid();
        p.name = "  Name  ";
        expect(personaInputSchema.parse(p).name).toBe("Name");
    });

    it("requires name, role, audience and at least one topic", () => {
        expect(fails((p) => (p.name = "   "))).toBe(true);
        expect(fails((p) => (p.identity.role = ""))).toBe(true);
        expect(fails((p) => (p.identity.targetAudience = ""))).toBe(true);
        expect(fails((p) => (p.research.topics = []))).toBe(true);
    });

    it("enforces list and number limits", () => {
        expect(fails((p) => (p.research.topics = Array.from({ length: PERSONA_LIMITS.topicsMax + 1 }, (_, i) => `t${i}`)))).toBe(true);
        expect(fails((p) => (p.research.feedUrls = Array.from({ length: PERSONA_LIMITS.feedUrlsMax + 1 }, (_, i) => `https://a.com/${i}`)))).toBe(true);
        expect(fails((p) => (p.publishing.postsPerDay = 0))).toBe(true);
        expect(fails((p) => (p.publishing.postsPerDay = PERSONA_LIMITS.postsPerDayMax + 1))).toBe(true);
        expect(fails((p) => (p.publishing.postsPerDay = 1.5))).toBe(true);
        expect(fails((p) => (p.name = "x".repeat(PERSONA_LIMITS.nameMax + 1)))).toBe(true);
        expect(fails((p) => (p.ai.monthlyCreditLimit = -1))).toBe(true);
    });

    it("rejects unknown time zones", () => {
        expect(fails((p) => (p.publishing.timezone = "Mars/Olympus"))).toBe(true);
        expect(isValidTimeZone("UTC")).toBe(true);
        expect(isValidTimeZone("America/New_York")).toBe(true);
    });

    it("rejects invalid, inverted and overlapping posting windows", () => {
        expect(fails((p) => (p.publishing.postingWindows = []))).toBe(true);
        expect(fails((p) => (p.publishing.postingWindows = [{ start: "9:00", end: "11:00" }]))).toBe(true);
        expect(fails((p) => (p.publishing.postingWindows = [{ start: "11:00", end: "09:00" }]))).toBe(true);
        expect(fails((p) => (p.publishing.postingWindows = [{ start: "09:00", end: "11:00" }, { start: "10:30", end: "12:00" }]))).toBe(true);
        // touching windows are fine
        expect(fails((p) => (p.publishing.postingWindows = [{ start: "09:00", end: "10:00" }, { start: "10:00", end: "11:00" }]))).toBe(false);
    });

    it("treats null or blank optional text as not set (the callable SDK sends undefined as null)", () => {
        const p = valid() as any;
        p.description = null;
        p.identity.customInstructions = null;
        const parsed = personaInputSchema.parse(p);
        expect(parsed.description).toBeUndefined();
        expect(parsed.identity.customInstructions).toBeUndefined();
        p.identity.customInstructions = "   ";
        expect(personaInputSchema.parse(p).identity.customInstructions).toBeUndefined();
    });

    it("approval mode is manual or automatic (automatic is only applied via setPersonaApprovalMode)", () => {
        expect(fails((p) => (p.publishing.approvalMode = "automatic"))).toBe(false);
        expect(fails((p) => ((p.publishing as { approvalMode: string }).approvalMode = "auto"))).toBe(true);
    });

    it("only allows https feed URLs", () => {
        expect(fails((p) => (p.research.feedUrls = ["http://example.com/feed"]))).toBe(true);
        expect(fails((p) => (p.research.feedUrls = ["file:///etc/passwd"]))).toBe(true);
        expect(fails((p) => (p.research.feedUrls = ["not a url"]))).toBe(true);
    });

    it("only allows supported platforms", () => {
        expect(fails((p) => (p.publishing.accountIds = ["reddit"]))).toBe(true);
        expect(fails((p) => (p.publishing.accountIds = []))).toBe(true);
    });

    it("rejects unknown fields (no smuggling status/version/workspaceId)", () => {
        expect(fails((p) => (p.status = "active"))).toBe(true);
        expect(fails((p) => (p.workspaceId = "someone-else"))).toBe(true);
    });
});

describe("other callable schemas", () => {
    it("validates updatePersona payload", () => {
        expect(updatePersonaSchema.safeParse({ personaId: "abc_1", expectedVersion: 1, persona: valid() }).success).toBe(true);
        expect(updatePersonaSchema.safeParse({ personaId: "../x", expectedVersion: 1, persona: valid() }).success).toBe(false);
        expect(updatePersonaSchema.safeParse({ personaId: "abc", expectedVersion: 0, persona: valid() }).success).toBe(false);
    });

    it("validates setPersonaStatus payload", () => {
        expect(setPersonaStatusSchema.safeParse({ personaId: "abc", status: "paused" }).success).toBe(true);
        expect(setPersonaStatusSchema.safeParse({ personaId: "abc", status: "deleted" }).success).toBe(false);
    });
});
