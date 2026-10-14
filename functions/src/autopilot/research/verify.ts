import { domainOf } from "./dedupe";
import { mentionsExcluded } from "./relevance";

/** Lowercase, unify quotes/dashes, collapse whitespace – for tolerant but honest substring checks. */
export function normalizeForMatch(text: string): string {
    return text
        .normalize("NFKC")
        .replace(/[‘’‚‛′]/g, "'")
        .replace(/[“”„‟″]/g, "\"")
        .replace(/[‐-―−]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

/** A claimed quote counts only if it appears verbatim (after normalisation) in the article text. */
export function quoteInText(quote: string, articleText: string): boolean {
    const q = normalizeForMatch(quote).replace(/[.…]+$/, "");
    return q.length >= 10 && normalizeForMatch(articleText).includes(q);
}

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?%?/g;
const WORD_NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** Numbers in `text` (as plain digit strings, thousands separators removed). Single digits 0-9 are ignored as too generic. */
export function numbersIn(text: string): string[] {
    const found = text.match(NUMBER_RE) ?? [];
    return Array.from(new Set(found.map((n) => n.replace(/,/g, ""))))
        .filter((n) => !/^\d$/.test(n.replace("%", "")) || n.endsWith("%"));
}

/** Numbers in the post that appear in none of the evidence texts – likely invented statistics. */
export function unsupportedNumbers(post: string, evidenceTexts: string[]): string[] {
    const evidence = normalizeForMatch(evidenceTexts.join(" ")).replace(/(\d),(?=\d{3})/g, "$1");
    return numbersIn(post).filter((n) => !evidence.includes(n.toLowerCase()) && !WORD_NUMBERS.includes(n));
}

export interface DeterministicInput {
    post: string;
    hashtags: string[];
    citedUrls: string[];
    fetchedUrls: string[];
    evidenceTexts: string[];
    excludedTopics: string[];
    minSourceCount: number;
}

export interface DeterministicResult {
    ok: boolean;
    reasons: string[];
    distinctDomains: number;
}

/** Cheap, code-only checks every draft must pass before the (paid) AI claim check runs. */
export function verifyDeterministic(input: DeterministicInput): DeterministicResult {
    const reasons: string[] = [];
    const fetched = new Set(input.fetchedUrls);
    const unknown = input.citedUrls.filter((u) => !fetched.has(u));
    if (unknown.length) reasons.push("Cites a source that was not fetched.");

    const domains = new Set(input.citedUrls.map(domainOf).filter(Boolean));
    if (domains.size < input.minSourceCount) reasons.push(`Uses ${domains.size} distinct source(s); ${input.minSourceCount} required.`);

    const badNumbers = unsupportedNumbers(input.post, input.evidenceTexts);
    if (badNumbers.length) reasons.push(`Contains numbers not found in the sources: ${badNumbers.slice(0, 5).join(", ")}.`);

    if (mentionsExcluded(`${input.post} ${input.hashtags.join(" ")}`, input.excludedTopics)) reasons.push("Mentions an excluded topic.");
    if (/<<<|>>>|\[SYSTEM|\[INSTRUCTION/i.test(input.post)) reasons.push("Contains leaked prompt markers.");
    if (input.post.length > 3000) reasons.push("Too long.");

    return { ok: reasons.length === 0, reasons, distinctDomains: domains.size };
}

export interface ScoreInput {
    distinctDomains: number;
    minSourceCount: number;
    claimsChecked: number;
    claimsSupported: number;
    newestSourceAgeHours?: number;
    freshnessHours: number;
}

/** 0–100 quality score shown in the UI: source diversity, verified-claim ratio, recency. */
export function qualityScore(input: ScoreInput): number {
    const diversity = Math.min(1, input.distinctDomains / Math.max(1, input.minSourceCount + 1));
    const verified = input.claimsChecked ? input.claimsSupported / input.claimsChecked : 0.5;
    const recency =
        input.newestSourceAgeHours === undefined ? 0.5 : Math.max(0, 1 - input.newestSourceAgeHours / Math.max(1, input.freshnessHours));
    return Math.round((diversity * 0.35 + verified * 0.45 + recency * 0.2) * 100);
}
