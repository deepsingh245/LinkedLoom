import type { ZodType } from "zod";

export const PROVIDERS = ["gemini", "openai"] as const;
export type ProviderId = (typeof PROVIDERS)[number];
export type BillingMode = "managed" | "byok";
export type ModelProfile = "economy" | "balanced" | "quality";

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
}

export interface AIRequest {
    model: string;
    prompt: string;
    system?: string;
    maxOutputTokens: number;
    temperature?: number;
}

export interface StructuredSpec<T> {
    name: string;
    schema: ZodType<T>;
}

export interface AIResult {
    text: string;
    usage: TokenUsage;
    model: string;
    provider: ProviderId;
}

export interface StructuredAIResult<T> extends AIResult {
    data: T;
}

export interface CallOptions {
    apiKey: string;
    timeoutMs: number;
}

export interface AIProvider {
    id: ProviderId;
    generateText(request: AIRequest, options: CallOptions): Promise<AIResult>;
    generateStructured<T>(request: AIRequest, spec: StructuredSpec<T>, options: CallOptions): Promise<StructuredAIResult<T>>;
    /** Cheap call that proves the key works (e.g. list models). Throws ProviderError on failure. */
    validateKey(apiKey: string, timeoutMs: number): Promise<void>;
}

/**
 * Normalised provider failure.
 * - auth: key rejected
 * - rate_limit: provider throttled us
 * - bad_request: our request was invalid (won't succeed on retry)
 * - bad_output: model returned output that doesn't match the schema
 * - ambiguous: timeout/network error after sending; the provider may have processed (and billed) it
 * - unavailable: provider error before processing (5xx)
 */
export type ProviderErrorKind = "auth" | "rate_limit" | "bad_request" | "bad_output" | "ambiguous" | "unavailable";

export class ProviderError extends Error {
    constructor(public kind: ProviderErrorKind, message: string, public status?: number) {
        super(message);
        this.name = "ProviderError";
    }
}
