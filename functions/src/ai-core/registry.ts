import type { ModelProfile, ProviderId } from "./types";

export interface ModelSpec {
    id: string;
    provider: ProviderId;
    contextTokens: number;
    structuredOutput: boolean;
}

// Model capability registry. VERIFY model ids against each provider's current model list before launch.
const MODELS: Record<ProviderId, Record<ModelProfile, ModelSpec>> = {
    gemini: {
        economy: { id: "gemini-2.5-flash-lite", provider: "gemini", contextTokens: 1_000_000, structuredOutput: true },
        balanced: { id: "gemini-2.5-flash", provider: "gemini", contextTokens: 1_000_000, structuredOutput: true },
        quality: { id: "gemini-2.5-pro", provider: "gemini", contextTokens: 1_000_000, structuredOutput: true },
    },
    openai: {
        economy: { id: "gpt-5.4-nano", provider: "openai", contextTokens: 400_000, structuredOutput: true },
        balanced: { id: "gpt-5.4-mini", provider: "openai", contextTokens: 400_000, structuredOutput: true },
        quality: { id: "gpt-5.5", provider: "openai", contextTokens: 400_000, structuredOutput: true },
    },
};

/** Provider used for managed (LinkedLoom-paid) AI. */
export const DEFAULT_MANAGED_PROVIDER: ProviderId = "gemini";

export function resolveModel(provider: ProviderId, profile: ModelProfile): ModelSpec {
    return MODELS[provider][profile];
}
