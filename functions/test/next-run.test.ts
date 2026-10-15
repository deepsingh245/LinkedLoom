import { describe, expect, it } from "vitest";
import { localParts, nextRunAfter, runTimesBetween, zonedTimeToUtc } from "../src/autopilot/scheduling/next-run";

const iso = (d: Date | null) => d?.toISOString();
const NY = { timezone: "America/New_York", postsPerDay: 1, postingWindows: [{ start: "09:00", end: "11:00" }] };

describe("zonedTimeToUtc", () => {
    it("converts wall-clock times in fixed-offset zones", () => {
        expect(iso(zonedTimeToUtc(2026, 10, 14, 9 * 60, "Asia/Kolkata"))).toBe("2026-10-14T03:30:00.000Z"); // UTC+5:30
        expect(iso(zonedTimeToUtc(2026, 10, 14, 9 * 60, "UTC"))).toBe("2026-10-14T09:00:00.000Z");
        expect(iso(zonedTimeToUtc(2026, 6, 15, 9 * 60, "Asia/Tokyo"))).toBe("2026-06-15T00:00:00.000Z");
    });

    it("handles daylight saving: standard vs daylight time in New York", () => {
        expect(iso(zonedTimeToUtc(2026, 1, 15, 9 * 60, "America/New_York"))).toBe("2026-01-15T14:00:00.000Z"); // EST = UTC-5
        expect(iso(zonedTimeToUtc(2026, 7, 15, 9 * 60, "America/New_York"))).toBe("2026-07-15T13:00:00.000Z"); // EDT = UTC-4
        expect(iso(zonedTimeToUtc(2026, 7, 15, 9 * 60, "Europe/London"))).toBe("2026-07-15T08:00:00.000Z"); // BST = UTC+1
        expect(iso(zonedTimeToUtc(2026, 1, 15, 9 * 60, "Europe/London"))).toBe("2026-01-15T09:00:00.000Z");
    });

    it("round-trips through localParts across the year", () => {
        for (const tz of ["America/New_York", "Europe/London", "Asia/Kolkata", "Australia/Sydney", "America/Sao_Paulo"]) {
            for (let m = 1; m <= 12; m++) {
                const d = zonedTimeToUtc(2026, m, 10, 7 * 60 + 30, tz);
                expect(localParts(d, tz)).toMatchObject({ month: m, day: 10, hour: 7, minute: 30 });
            }
        }
    });

    it("rolls negative and >24h minute offsets into adjacent days", () => {
        expect(iso(zonedTimeToUtc(2026, 10, 14, -90, "UTC"))).toBe("2026-10-13T22:30:00.000Z");
        expect(iso(zonedTimeToUtc(2026, 10, 14, 25 * 60, "UTC"))).toBe("2026-10-15T01:00:00.000Z");
    });

    it("spring-forward gap resolves to a valid instant after the gap (2026-03-08 02:30 doesn't exist in New York)", () => {
        const d = zonedTimeToUtc(2026, 3, 8, 2 * 60 + 30, "America/New_York");
        expect(localParts(d, "America/New_York").hour).toBeGreaterThanOrEqual(3);
    });

    it("fall-back overlap resolves to the earlier instant (2026-11-01 01:30 happens twice in New York)", () => {
        expect(iso(zonedTimeToUtc(2026, 11, 1, 90, "America/New_York"))).toBe("2026-11-01T05:30:00.000Z"); // first (EDT) occurrence
    });
});

describe("nextRunAfter", () => {
    it("runs 90 minutes before the window, in the persona's time zone", () => {
        // 09:00 window → 07:30 local. Now is 2026-10-14 05:00 UTC = 01:00 EDT → next is today 07:30 EDT = 11:30 UTC.
        expect(iso(nextRunAfter(NY, new Date("2026-10-14T05:00:00Z"), 90))).toBe("2026-10-14T11:30:00.000Z");
    });

    it("moves to tomorrow once today's run has passed", () => {
        expect(iso(nextRunAfter(NY, new Date("2026-10-14T12:00:00Z"), 90))).toBe("2026-10-15T11:30:00.000Z");
    });

    it("is strictly after `from` (an instant exactly at a run time schedules the next one)", () => {
        expect(iso(nextRunAfter(NY, new Date("2026-10-14T11:30:00Z"), 90))).toBe("2026-10-15T11:30:00.000Z");
    });

    it("a window right after midnight has its run on the previous local day", () => {
        const p = { timezone: "UTC", postsPerDay: 1, postingWindows: [{ start: "00:30", end: "02:00" }] };
        expect(iso(nextRunAfter(p, new Date("2026-10-14T10:00:00Z"), 90))).toBe("2026-10-14T23:00:00.000Z");
        expect(iso(nextRunAfter(p, new Date("2026-10-14T23:30:00Z"), 90))).toBe("2026-10-15T23:00:00.000Z");
    });

    it("uses the first postsPerDay windows sorted by start, ignoring the rest", () => {
        const p = {
            timezone: "UTC",
            postsPerDay: 2,
            postingWindows: [{ start: "17:00", end: "18:00" }, { start: "09:00", end: "10:00" }, { start: "13:00", end: "14:00" }],
        };
        const times = runTimesBetween(p, new Date("2026-10-14T00:00:00Z"), 1, 60).map(iso);
        expect(times).toEqual(["2026-10-14T08:00:00.000Z", "2026-10-14T12:00:00.000Z"]); // 09:00 and 13:00, not 17:00
    });

    it("always schedules at least one run when postsPerDay is 0", () => {
        const p = { timezone: "UTC", postsPerDay: 0, postingWindows: [{ start: "09:00", end: "10:00" }] };
        expect(nextRunAfter(p, new Date("2026-10-14T00:00:00Z"), 60)).not.toBeNull();
    });

    it("returns null with no windows", () => {
        expect(nextRunAfter({ timezone: "UTC", postsPerDay: 1, postingWindows: [] }, new Date(), 90)).toBeNull();
    });

    it("keeps the local time constant across the spring-forward change", () => {
        const times = runTimesBetween(NY, new Date("2026-03-06T13:00:00Z"), 5, 90); // 7–11 March, DST starts on the 8th
        const local = times.map((t) => `${localParts(t, "America/New_York").hour}:${localParts(t, "America/New_York").minute}`);
        expect(times).toHaveLength(5);
        expect(new Set(local)).toEqual(new Set(["7:30"]));
        // UTC time shifts by one hour across the change.
        expect(iso(times[0])).toBe("2026-03-07T12:30:00.000Z"); // EST
        expect(iso(times[1])).toBe("2026-03-08T11:30:00.000Z"); // EDT (the day DST begins)
        expect(iso(times[4])).toBe("2026-03-11T11:30:00.000Z");
    });

    it("keeps the local time constant across the fall-back change", () => {
        const times = runTimesBetween(NY, new Date("2026-10-30T12:00:00Z"), 5, 90);
        const local = times.map((t) => `${localParts(t, "America/New_York").hour}:${localParts(t, "America/New_York").minute}`);
        expect(new Set(local)).toEqual(new Set(["7:30"]));
    });

    it("works for half-hour offset zones and the southern hemisphere", () => {
        const kol = { timezone: "Asia/Kolkata", postsPerDay: 1, postingWindows: [{ start: "09:00", end: "10:00" }] };
        expect(iso(nextRunAfter(kol, new Date("2026-10-14T00:00:00Z"), 90))).toBe("2026-10-14T02:00:00.000Z"); // 07:30 IST
        const syd = { timezone: "Australia/Sydney", postsPerDay: 1, postingWindows: [{ start: "09:00", end: "10:00" }] };
        const t = nextRunAfter(syd, new Date("2026-12-01T00:00:00Z"), 90)!;
        expect(localParts(t, "Australia/Sydney")).toMatchObject({ hour: 7, minute: 30 });
    });

    it("produces strictly increasing, evenly spaced daily runs", () => {
        const times = runTimesBetween(NY, new Date("2026-10-14T00:00:00Z"), 14, 90);
        expect(times).toHaveLength(14);
        for (let i = 1; i < times.length; i++) expect(times[i].getTime()).toBeGreaterThan(times[i - 1].getTime());
    });
});
