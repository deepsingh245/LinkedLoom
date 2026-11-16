import { localParts, zonedTimeToUtc, type ScheduleInput } from "../scheduling/next-run";

/**
 * "Next free posting slot" for an approved draft, in the persona's time zone.
 *
 * Candidate slots are the persona's first `postsPerDay` posting windows on each local day. A window is
 * taken when the user already has a post scheduled inside it (any persona, or a manual post – we never
 * stack two posts in one window), and a day is full when this persona already has `postsPerDay` posts.
 * The slot time is the window start, or – for the window that is open right now – the next 5-minute
 * mark at least `minLeadMinutes` from now.
 */

const MS_MIN = 60_000;
const MS_DAY = 86_400_000;
export const SLOT_SEARCH_DAYS = 14;
export const SLOT_MIN_LEAD_MINUTES = 15;

export interface OccupiedSlot {
    at: Date;
    personaId?: string;
}

export interface FreeSlot {
    at: Date;
    window: { start: string; end: string };
    /** Local date of the slot, YYYY-MM-DD. */
    localDate: string;
}

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

const pad = (n: number) => String(n).padStart(2, "0");
export const localDateOf = (instant: Date, timeZone: string) => {
    const p = localParts(instant, timeZone);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};

export function nextFreeSlot(
    input: ScheduleInput,
    occupied: OccupiedSlot[],
    opts: { now: Date; personaId?: string; days?: number; minLeadMinutes?: number }
): FreeSlot | null {
    if (!input.postingWindows.length) return null;
    const earliest = opts.now.getTime() + (opts.minLeadMinutes ?? SLOT_MIN_LEAD_MINUTES) * MS_MIN;
    const windows = [...input.postingWindows]
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
        .slice(0, Math.max(1, input.postsPerDay));

    // Posts of this persona per local day (daily cap).
    const perDay = new Map<string, number>();
    for (const o of occupied) {
        if (opts.personaId && o.personaId === opts.personaId) {
            const key = localDateOf(o.at, input.timezone);
            perDay.set(key, (perDay.get(key) ?? 0) + 1);
        }
    }

    const today = localParts(opts.now, input.timezone);
    const base = Date.UTC(today.year, today.month - 1, today.day);
    for (let offset = 0; offset < (opts.days ?? SLOT_SEARCH_DAYS); offset++) {
        const d = new Date(base + offset * MS_DAY);
        const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
        const localDate = `${y}-${pad(m)}-${pad(day)}`;
        if ((perDay.get(localDate) ?? 0) >= Math.max(1, input.postsPerDay)) continue;

        for (const w of windows) {
            const start = zonedTimeToUtc(y, m, day, toMinutes(w.start), input.timezone).getTime();
            const end = zonedTimeToUtc(y, m, day, toMinutes(w.end), input.timezone).getTime();
            if (end <= earliest) continue;
            const taken = occupied.some((o) => o.at.getTime() >= start && o.at.getTime() < end);
            if (taken) continue;
            const at = start >= earliest ? start : Math.ceil(earliest / (5 * MS_MIN)) * 5 * MS_MIN;
            if (at >= end) continue;
            return { at: new Date(at), window: { start: w.start, end: w.end }, localDate };
        }
    }
    return null;
}
