import { z } from "zod";
import { AIProvider, AIRequest, AIResult, ProviderError, ProviderId, StructuredAIResult, StructuredSpec } from "../types";
import { parseStructured } from "./structured";

/**
 * Deterministic provider for emulator tests (AI_PROVIDER_MOCK=true). Never used in production.
 * Magic prompt markers let tests simulate failures:
 *   [mock:rate_limit] [mock:ambiguous] [mock:bad_request]
 * Keys starting with "test-valid" are accepted by validateKey; anything else is rejected.
 */
export function isMockEnabled(): boolean {
    return process.env.AI_PROVIDER_MOCK === "true" && process.env.FUNCTIONS_EMULATOR === "true";
}

function failIfAsked(prompt: string) {
    if (prompt.includes("[mock:rate_limit]")) throw new ProviderError("rate_limit", "Mock rate limit.", 429);
    if (prompt.includes("[mock:ambiguous]")) throw new ProviderError("ambiguous", "Mock timeout.");
    if (prompt.includes("[mock:bad_request]")) throw new ProviderError("bad_request", "Mock bad request.", 400);
}

function usageFor(request: AIRequest, output: string) {
    return { inputTokens: Math.ceil(request.prompt.length / 4), outputTokens: Math.min(request.maxOutputTokens, Math.ceil(output.length / 4)) };
}

/** Builds a minimal value that satisfies common schema shapes (object of strings/arrays/numbers). */
function sampleFor(schema: unknown): unknown {
    const json = z.toJSONSchema(schema as z.ZodType) as { properties?: Record<string, { type?: string }> };
    const out: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(json.properties ?? {})) {
        if (prop.type === "array") out[key] = ["#mock"];
        else if (prop.type === "number" || prop.type === "integer") out[key] = 1;
        else if (prop.type === "boolean") out[key] = true;
        else out[key] = `Mock ${key}`;
    }
    return out;
}

export function mockProvider(id: ProviderId): AIProvider {
    return {
        id,
        async generateText(request): Promise<AIResult> {
            failIfAsked(request.prompt);
            const text = `Mock ${id} response for: ${request.prompt.slice(0, 80)}`;
            return { text, usage: usageFor(request, text), model: request.model, provider: id };
        },
        async generateStructured<T>(request: AIRequest, spec: StructuredSpec<T>): Promise<StructuredAIResult<T>> {
            failIfAsked(request.prompt);
            const text = JSON.stringify(sampleFor(spec.schema));
            return { text, usage: usageFor(request, text), model: request.model, provider: id, data: parseStructured(text, spec) };
        },
        async validateKey(apiKey) {
            if (!apiKey.startsWith("test-valid")) throw new ProviderError("auth", "Mock: key rejected.", 401);
        },
    };
}
