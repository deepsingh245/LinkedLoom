/**
 * Research schedule: run before each of the persona's posting windows, in the persona's time zone.
 *
 *   run time = window.start − lead   (default 90 min)
 *   one run per window, for the first `postsPerDay` windows (sorted by start)
 *
 * DST-safe, no dependencies (uses Intl). All results are absolute instants (Date).
 */

export const DEFAULT_LEAD_MINUTES = 90;
export const leadMinutes = () => Number(process.env.AUTOPILOT_RESEARCH_LEAD_MINUTES || DEFAULT_LEAD_MINUTES);

export interface ScheduleInput {
    timezone: string;
    postsPerDay: number;
    postingWindows: Array<{ start: string; end: string }>;
}

const MS_MIN = 60_000;
const MS_DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(timeZone: string): Intl.DateTimeFormat {
    let f = formatters.get(timeZone);
    if (!f) {
        f = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            year: "numeric", month: "numeric", day: "numeric",
            hour: "numeric", minute: "numeric", second: "numeric",
        });
        formatters.set(timeZone, f);
    }
    return f;
}

/** Local wall-clock fields of an instant in a time zone. */
export function localParts(instant: Date, timeZone: string) {
    const parts = formatterFor(timeZone).formatToParts(instant);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute"), second: get("second") };
}

/** Offset (ms) such that localWallClockAsUTC = instant + offset. */
function offsetMs(instant: Date, timeZone: string): number {
    const p = localParts(instant, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `timeZone` reads year-month-day hour:minute.
 * `minuteOfDay` may be negative or exceed 1440 (it rolls into adjacent days).
 * Nonexistent times (spring-forward gap) resolve to the first valid instant after the gap;
 * ambiguous times (fall-back overlap) resolve to the earlier of the two.
 */
export function zonedTimeToUtc(year: number, month: number, day: number, minuteOfDay: number, timeZone: string): Date {
    const naive = Date.UTC(year, month - 1, day) + minuteOfDay * MS_MIN;
    // A zone has at most one offset change within ±1 day, so the right answer uses either the offset
    // just before or just after it. Try both and keep the candidate whose wall clock matches.
    const candidates = Array.from(new Set([offsetMs(new Date(naive - MS_DAY), timeZone), offsetMs(new Date(naive + MS_DAY), timeZone)]))
        .map((offset) => naive - offset);
    const valid = candidates.filter((c) => c + offsetMs(new Date(c), timeZone) === naive);
    // valid.length 2 = overlap (fall back) → earlier instant; 0 = gap (spring forward) → the later instant, shifting past the gap.
    return new Date(valid.length ? Math.min(...valid) : Math.max(...candidates));
}

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

/** Run times for the local calendar day `year-month-day`, ascending. */
export function runTimesForDay(input: ScheduleInput, year: number, month: number, day: number, lead = leadMinutes()): Date[] {
    const windows = [...input.postingWindows].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)).slice(0, Math.max(1, input.postsPerDay));
    return windows.map((w) => zonedTimeToUtc(year, month, day, toMinutes(w.start) - lead, input.timezone)).sort((a, b) => a.getTime() - b.getTime());
}

/** The next scheduled run strictly after `from`, or null when there are no windows. */
export function nextRunAfter(input: ScheduleInput, from: Date, lead = leadMinutes()): Date | null {
    if (!input.postingWindows.length) return null;
    const local = localParts(from, input.timezone);
    const base = Date.UTC(local.year, local.month - 1, local.day);
    // Local days around "today": a window just after midnight has its run on the previous local day.
    for (let offset = -1; offset <= 3; offset++) {
        const d = new Date(base + offset * MS_DAY);
        const candidates = runTimesForDay(input, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), lead);
        const next = candidates.find((t) => t.getTime() > from.getTime());
        if (next) return next;
    }
    return null;
}

/** All run times in [from, from + days). Handy for previews and tests. */
export function runTimesBetween(input: ScheduleInput, from: Date, days: number, lead = leadMinutes()): Date[] {
    const out: Date[] = [];
    let cursor = from;
    const end = from.getTime() + days * MS_DAY;
    for (let i = 0; i < days * 12; i++) {
        const next = nextRunAfter(input, cursor, lead);
        if (!next || next.getTime() >= end) break;
        out.push(next);
        cursor = next;
    }
    return out;
}
