import type { AIProvider, ProviderId } from "../types";
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";
import { isMockEnabled, mockProvider } from "./mock";

export function getProvider(id: ProviderId): AIProvider {
    if (isMockEnabled()) return mockProvider(id);
    return id === "gemini" ? geminiProvider : openaiProvider;
}
