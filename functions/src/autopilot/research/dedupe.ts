import { createHash } from "crypto";

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|ref_src$|igshid$|yclid$|_hsenc$|_hsmi$)/i;

/** Normalise a URL so the same article reached via different links maps to one key. */
export function canonicalUrl(raw: string): string {
    try {
        const url = new URL(raw);
        url.hash = "";
        url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
        for (const key of Array.from(url.searchParams.keys())) {
            if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
        }
        url.searchParams.sort();
        let path = url.pathname.replace(/\/{2,}/g, "/");
        if (path.length > 1) path = path.replace(/\/+$/, "");
        url.pathname = path;
        return `${url.protocol}//${url.host}${url.pathname}${url.search}`;
    } catch {
        return raw.trim();
    }
}

export const urlId = (canonical: string) => createHash("sha1").update(canonical).digest("hex");

export const domainOf = (raw: string): string => {
    try {
        return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
        return "";
    }
};

const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are", "was", "were", "by", "at", "as",
    "from", "that", "this", "it", "its", "be", "how", "why", "what", "new", "your", "you", "we", "our", "will", "can",
]);

/** Sorted, de-duplicated significant words of a title – a cheap "same story" fingerprint. */
export function titleTokens(title: string): string[] {
    const words = title
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    return Array.from(new Set(words)).sort();
}

export const fingerprint = (title: string) => titleTokens(title).join(" ");

export function jaccard(a: string[], b: string[]): number {
    if (!a.length || !b.length) return 0;
    const setB = new Set(b);
    const intersection = a.filter((w) => setB.has(w)).length;
    return intersection / (a.length + b.length - intersection);
}

export const DUPLICATE_THRESHOLD = 0.6;

/** True when `title` looks like the same story as any known fingerprint. */
export function isNearDuplicate(title: string, knownFingerprints: string[], threshold = DUPLICATE_THRESHOLD): boolean {
    const tokens = titleTokens(title);
    if (tokens.length < 3) return false;
    return knownFingerprints.some((fp) => jaccard(tokens, fp.split(" ").filter(Boolean)) >= threshold);
}
