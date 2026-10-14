import { AIProvider, AIRequest, AIResult, CallOptions, ProviderError, StructuredAIResult, StructuredSpec } from "../types";
import { parseStructured, toProviderJsonSchema } from "./structured";

// Lazy: the SDK is slow to load and only needed when an OpenAI call is actually made.
const sdk = () => require("openai") as typeof import("openai");

function toProviderError(error: unknown): ProviderError {
    if (error instanceof ProviderError) return error;
    const { APIConnectionError, APIError } = sdk();
    // Connection errors (incl. timeouts) happen after we may have sent the request.
    if (error instanceof APIConnectionError) return new ProviderError("ambiguous", "OpenAI request did not complete.");
    if (error instanceof APIError) {
        const status = error.status ?? 0;
        if (status === 401 || status === 403) return new ProviderError("auth", "OpenAI rejected the API key.", status);
        if (status === 429) return new ProviderError("rate_limit", "OpenAI rate limit or quota reached.", status);
        if (status >= 400 && status < 500) return new ProviderError("bad_request", `OpenAI rejected the request (${status}).`, status);
        return new ProviderError("unavailable", `OpenAI is unavailable (${status}).`, status);
    }
    return new ProviderError("ambiguous", "OpenAI request did not complete.");
}

// maxRetries 0: retries are decided by our own billing/idempotency logic, not hidden in the SDK.
const client = (apiKey: string, timeoutMs: number) => new (sdk().OpenAI)({ apiKey, timeout: timeoutMs, maxRetries: 0 });

async function generate(
    request: AIRequest,
    options: CallOptions,
    json?: { name: string; schema: Record<string, unknown> }
): Promise<AIResult> {
    try {
        const response = await client(options.apiKey, options.timeoutMs).responses.create({
            model: request.model,
            input: request.prompt,
            ...(request.system ? { instructions: request.system } : {}),
            max_output_tokens: request.maxOutputTokens,
            ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
            ...(json ? { text: { format: { type: "json_schema" as const, name: json.name, schema: json.schema, strict: true } } } : {}),
        });
        return {
            text: response.output_text ?? "",
            usage: {
                inputTokens: response.usage?.input_tokens ?? 0,
                outputTokens: response.usage?.output_tokens ?? 0,
            },
            model: request.model,
            provider: "openai",
        };
    } catch (error) {
        throw toProviderError(error);
    }
}

export const openaiProvider: AIProvider = {
    id: "openai",
    generateText: (request, options) => generate(request, options),
    async generateStructured<T>(request: AIRequest, spec: StructuredSpec<T>, options: CallOptions): Promise<StructuredAIResult<T>> {
        const result = await generate(request, options, { name: spec.name, schema: toProviderJsonSchema(spec) });
        return { ...result, data: parseStructured(result.text, spec) };
    },
    async validateKey(apiKey, timeoutMs) {
        try {
            await client(apiKey, timeoutMs).models.list();
        } catch (error) {
            throw toProviderError(error);
        }
    },
};
