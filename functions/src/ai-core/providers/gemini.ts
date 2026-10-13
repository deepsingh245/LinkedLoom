import { ApiError, GoogleGenAI } from "@google/genai";
import { AIProvider, AIRequest, AIResult, CallOptions, ProviderError, StructuredAIResult, StructuredSpec } from "../types";
import { parseStructured, toProviderJsonSchema } from "./structured";

function toProviderError(error: unknown): ProviderError {
    if (error instanceof ProviderError) return error;
    if (error instanceof ApiError) {
        const status = error.status;
        if (status === 401 || status === 403) return new ProviderError("auth", "Gemini rejected the API key.", status);
        if (status === 400 && /api key/i.test(error.message)) return new ProviderError("auth", "Gemini rejected the API key.", status);
        if (status === 429) return new ProviderError("rate_limit", "Gemini rate limit reached.", status);
        if (status >= 400 && status < 500) return new ProviderError("bad_request", `Gemini rejected the request (${status}).`, status);
        return new ProviderError("unavailable", `Gemini is unavailable (${status}).`, status);
    }
    // Timeouts / network errors after the request was sent: outcome unknown.
    return new ProviderError("ambiguous", "Gemini request did not complete.");
}

const client = (apiKey: string, timeoutMs: number) => new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });

async function generate(request: AIRequest, options: CallOptions, json?: Record<string, unknown>): Promise<AIResult> {
    try {
        const response = await client(options.apiKey, options.timeoutMs).models.generateContent({
            model: request.model,
            contents: request.prompt,
            config: {
                ...(request.system ? { systemInstruction: request.system } : {}),
                maxOutputTokens: request.maxOutputTokens,
                ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
                ...(json ? { responseMimeType: "application/json", responseJsonSchema: json } : {}),
            },
        });
        const usage = response.usageMetadata;
        return {
            text: response.text ?? "",
            usage: {
                inputTokens: usage?.promptTokenCount ?? 0,
                // Thinking tokens are billed as output.
                outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
            },
            model: request.model,
            provider: "gemini",
        };
    } catch (error) {
        throw toProviderError(error);
    }
}

export const geminiProvider: AIProvider = {
    id: "gemini",
    generateText: (request, options) => generate(request, options),
    async generateStructured<T>(request: AIRequest, spec: StructuredSpec<T>, options: CallOptions): Promise<StructuredAIResult<T>> {
        const result = await generate(request, options, toProviderJsonSchema(spec));
        return { ...result, data: parseStructured(result.text, spec) };
    },
    async validateKey(apiKey, timeoutMs) {
        try {
            await client(apiKey, timeoutMs).models.list({ config: { pageSize: 1 } });
        } catch (error) {
            throw toProviderError(error);
        }
    },
};
