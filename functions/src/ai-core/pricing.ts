import type { TokenUsage } from "./types";

/**
 * Provider prices in USD per 1M tokens. Every usage record stores PRICE_VERSION so
 * historic costs stay explainable when prices change.
 *
 * ⚠️ PLACEHOLDER VALUES – verify against the official Gemini and OpenAI pricing pages and
 * bump PRICE_VERSION before charging real customers.
 */
export const PRICE_VERSION = "2026-10-draft";

const PRICES: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
    "gemini-2.5-flash-lite": { inputPerMTok: 0.1, outputPerMTok: 0.4 },
    "gemini-2.5-flash": { inputPerMTok: 0.3, outputPerMTok: 2.5 },
    "gemini-2.5-pro": { inputPerMTok: 1.25, outputPerMTok: 10 },
    "gemini-2.5-flash-image": { inputPerMTok: 0.3, outputPerMTok: 30 },
    "gpt-5.4-nano": { inputPerMTok: 0.1, outputPerMTok: 0.8 },
    "gpt-5.4-mini": { inputPerMTok: 0.5, outputPerMTok: 4 },
    "gpt-5.5": { inputPerMTok: 2.5, outputPerMTok: 15 },
};

// Unknown models are priced conservatively so we never under-reserve.
const FALLBACK_PRICE = { inputPerMTok: 5, outputPerMTok: 20 };

/** Illustrative product convention from the architecture doc: 100 credits ≈ $1 of customer value. */
export const CREDITS_PER_USD = 100;
/** Covers infrastructure and margin on top of the raw provider cost. */
export const CREDIT_MARGIN = 1.3;

export function priceFor(model: string) {
    return PRICES[model] ?? FALLBACK_PRICE;
}

/** Provider cost in micro-USD (integer, avoids float drift). */
export function costMicroUsd(model: string, usage: TokenUsage): number {
    const p = priceFor(model);
    return Math.ceil(usage.inputTokens * p.inputPerMTok + usage.outputTokens * p.outputPerMTok);
}

/** Credits charged for a provider cost. Any non-zero usage costs at least 1 credit. */
export function microUsdToCredits(microUsd: number): number {
    if (microUsd <= 0) return 0;
    return Math.max(1, Math.ceil((microUsd / 1_000_000) * CREDITS_PER_USD * CREDIT_MARGIN));
}

export function creditsFor(model: string, usage: TokenUsage): number {
    return microUsdToCredits(costMicroUsd(model, usage));
}

/** Rough token estimate (~4 chars/token) for reservations; deliberately generous. */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4) + 16;
}

/** Upper bound of credits a request can cost: full prompt + every allowed output token. */
export function estimateMaxCredits(model: string, promptChars: number, maxOutputTokens: number): number {
    return creditsFor(model, { inputTokens: Math.ceil(promptChars / 4) + 16, outputTokens: maxOutputTokens });
}
