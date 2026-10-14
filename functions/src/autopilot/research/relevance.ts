export interface Candidate {
    url: string;
    title: string;
    summary: string;
    publishedAt?: Date;
    origin: "feed" | "search";
}

export interface RelevanceConfig {
    topics: string[];
    keywords: string[];
    excludedTopics: string[];
    freshnessHours: number;
}

const words = (text: string) =>
    text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);

function phraseMatches(haystack: string, phrase: string): boolean {
    const p = words(phrase);
    if (!p.length) return false;
    const h = new Set(words(haystack));
    // Multi-word topics match when most of their significant words appear.
    return p.filter((w) => h.has(w)).length / p.length >= 0.6;
}

/** True when the text mentions any excluded topic. */
export function mentionsExcluded(text: string, excluded: string[]): boolean {
    return excluded.some((phrase) => phraseMatches(text, phrase));
}

export function isFresh(publishedAt: Date | undefined, freshnessHours: number, now = Date.now()): boolean {
    // Unknown date: keep it (search results often lack one); the model is told to avoid stale claims.
    if (!publishedAt) return true;
    return now - publishedAt.getTime() <= freshnessHours * 3_600_000;
}

/** 0..1 score from topic and keyword hits in the title + summary. Title hits count double. */
export function relevanceScore(candidate: Pick<Candidate, "title" | "summary">, config: Pick<RelevanceConfig, "topics" | "keywords">): number {
    const topicHits = config.topics.filter((t) => phraseMatches(candidate.title, t) || phraseMatches(candidate.summary, t));
    const titleHits = config.topics.filter((t) => phraseMatches(candidate.title, t)).length;
    const keywordHits = config.keywords.filter((k) => phraseMatches(`${candidate.title} ${candidate.summary}`, k)).length;
    const raw = topicHits.length + titleHits + keywordHits * 0.5;
    const max = Math.max(1, Math.min(3, config.topics.length) * 2 + Math.min(2, config.keywords.length) * 0.5);
    return Math.min(1, raw / max);
}

export const MIN_RELEVANCE = 0.15;
