// A5 pure logic: next free posting slot, publish error classification, token expiry.
import { describe, expect, it } from "vitest";
import { nextFreeSlot } from "../src/autopilot/approval/slots";
import { classifyPublishError, isExpired, linkedinPostUrl, retryDelayMs } from "../src/publishing/errors";
import { PublishError } from "../src/publishing/types";

const persona = (over: Partial<{ timezone: string; postsPerDay: number; postingWindows: Array<{ start: string; end: string }> }> = {}) => ({
    timezone: "UTC",
    postsPerDay: 1,
    postingWindows: [{ start: "09:00", end: "10:00" }],
    ...over,
});

describe("nextFreeSlot", () => {
    it("uses the window start of today when it's still ahead", () => {
        const slot = nextFreeSlot(persona(), [], { now: new Date("2026-03-02T06:00:00Z") });
        expect(slot?.at.toISOString()).toBe("2026-03-02T09:00:00.000Z");
        expect(slot?.window).toEqual({ start: "09:00", end: "10:00" });
    });

    it("inside an open window: next 5-minute mark at least 15 minutes from now", () => {
        const slot = nextFreeSlot(persona(), [], { now: new Date("2026-03-02T09:07:00Z") });
        expect(slot?.at.toISOString()).toBe("2026-03-02T09:25:00.000Z");
    });

    it("too late for today's window → tomorrow", () => {
        const slot = nextFreeSlot(persona(), [], { now: new Date("2026-03-02T09:50:00Z") });
        expect(slot?.at.toISOString()).toBe("2026-03-03T09:00:00.000Z");
    });

    it("skips windows that already hold a post (any persona or manual)", () => {
        const slot = nextFreeSlot(persona(), [{ at: new Date("2026-03-02T09:30:00Z") }], { now: new Date("2026-03-02T06:00:00Z") });
        expect(slot?.at.toISOString()).toBe("2026-03-03T09:00:00.000Z");
    });

    it("respects postsPerDay for the persona and fills the next window first", () => {
        const input = persona({ postsPerDay: 2, postingWindows: [{ start: "09:00", end: "10:00" }, { start: "17:00", end: "18:00" }] });
        const now = new Date("2026-03-02T06:00:00Z");
        expect(nextFreeSlot(input, [{ at: new Date("2026-03-02T09:00:00Z"), personaId: "p" }], { now, personaId: "p" })?.at.toISOString())
            .toBe("2026-03-02T17:00:00.000Z");
        // Two posts already today for this persona → tomorrow.
        const full = [{ at: new Date("2026-03-02T09:00:00Z"), personaId: "p" }, { at: new Date("2026-03-02T12:00:00Z"), personaId: "p" }];
        expect(nextFreeSlot(input, full, { now, personaId: "p" })?.at.toISOString()).toBe("2026-03-03T09:00:00.000Z");
    });

    it("only the first postsPerDay windows are posting slots", () => {
        const input = persona({ postsPerDay: 1, postingWindows: [{ start: "17:00", end: "18:00" }, { start: "09:00", end: "10:00" }] });
        expect(nextFreeSlot(input, [], { now: new Date("2026-03-02T12:00:00Z") })?.at.toISOString()).toBe("2026-03-03T09:00:00.000Z");
    });

    it("works in the persona's time zone across DST (New York, spring forward)", () => {
        const input = persona({ timezone: "America/New_York" });
        // 2026-03-08 is the US spring-forward day: 09:00 EDT = 13:00Z (the day before it was 14:00Z).
        const slot = nextFreeSlot(input, [], { now: new Date("2026-03-08T05:00:00Z") });
        expect(slot?.at.toISOString()).toBe("2026-03-08T13:00:00.000Z");
        expect(slot?.localDate).toBe("2026-03-08");
    });

    it("returns null when nothing is free in the search horizon", () => {
        const now = new Date("2026-03-02T06:00:00Z");
        const occupied = Array.from({ length: 3 }, (_, i) => ({ at: new Date(Date.UTC(2026, 2, 2 + i, 9, 30)) }));
        expect(nextFreeSlot(persona(), occupied, { now, days: 3 })).toBeNull();
        expect(nextFreeSlot(persona({ postingWindows: [] }), [], { now })).toBeNull();
    });
});

describe("classifyPublishError", () => {
    const http = (status: number, data: unknown = {}) => ({ response: { status, data } });

    it("auth problems ask the user to reconnect", () => {
        expect(classifyPublishError(http(401)).kind).toBe("auth");
        expect(classifyPublishError(http(403)).kind).toBe("auth");
    });

    it("rate limits and 503 are safe to retry", () => {
        expect(classifyPublishError(http(429)).kind).toBe("transient");
        expect(classifyPublishError(http(503)).kind).toBe("transient");
    });

    it("other server errors may have created the post → ambiguous", () => {
        for (const s of [500, 502, 504]) expect(classifyPublishError(http(s)).kind).toBe("ambiguous");
    });

    it("validation errors are definite and keep LinkedIn's message", () => {
        const e = classifyPublishError(http(422, { message: "Content is a duplicate" }));
        expect(e.kind).toBe("definite");
        expect(e.message).toContain("Content is a duplicate");
    });

    it("timeouts and resets are ambiguous; connection refused is transient", () => {
        expect(classifyPublishError({ code: "ECONNABORTED" }).kind).toBe("ambiguous");
        expect(classifyPublishError({ code: "ECONNRESET" }).kind).toBe("ambiguous");
        expect(classifyPublishError(new Error("weird")).kind).toBe("ambiguous");
        expect(classifyPublishError({ code: "ECONNREFUSED" }).kind).toBe("transient");
        expect(classifyPublishError({ code: "ENOTFOUND" }).kind).toBe("transient");
    });

    it("image upload failures happen before the post is sent → transient", () => {
        expect(classifyPublishError({ linkedinStage: "media", response: { status: 500 } }).kind).toBe("transient");
    });

    it("keeps PublishErrors as they are", () => {
        const e = new PublishError("definite", "x");
        expect(classifyPublishError(e)).toBe(e);
    });
});

describe("helpers", () => {
    it("isExpired handles Date, Timestamp-like, ISO and missing", () => {
        const now = Date.parse("2026-03-02T00:00:00Z");
        expect(isExpired(new Date(now - 1), now)).toBe(true);
        expect(isExpired(new Date(now + 60_000), now)).toBe(false);
        expect(isExpired({ toDate: () => new Date(now - 1) }, now)).toBe(true);
        expect(isExpired("2026-03-01T00:00:00Z", now)).toBe(true);
        expect(isExpired(undefined, now)).toBe(false);
    });

    it("retry backoff grows 5 → 15 → 45 minutes", () => {
        expect([1, 2, 3].map(retryDelayMs)).toEqual([5, 15, 45].map((m) => m * 60_000));
    });

    it("builds LinkedIn post URLs from URNs", () => {
        expect(linkedinPostUrl("urn:li:share:123")).toBe("https://www.linkedin.com/feed/update/urn:li:share:123");
        expect(linkedinPostUrl("")).toBeUndefined();
    });
});
