import { z } from "zod";
import { AIProvider, AIRequest, AIResult, GroundedResult, ProviderError, ProviderId, StructuredAIResult, StructuredSpec } from "../types";
import { GROUNDING_COST_MICRO_USD_PER_QUERY } from "../pricing";
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

/**
 * [mock:fail-once] fails the first call for a given prompt with a transient error and lets later calls through.
 * The "seen" flag lives in Firestore (emulator only) so it survives separate function instances/retries.
 */
async function failOnce(text: string) {
    const { createHash } = await import("crypto");
    const { getFirestore } = await import("firebase-admin/firestore");
    const id = createHash("sha1").update(text).digest("hex");
    try {
        await getFirestore().collection("_mockFlags").doc(id).create({ at: Date.now() });
    } catch {
        return; // already failed once before → proceed normally
    }
    throw new ProviderError("ambiguous", "Mock transient failure (first attempt).");
}

async function failIfAsked(request: AIRequest) {
    const text = `${request.system ?? ""}\n${request.prompt}`;
    if (text.includes("[mock:rate_limit]")) throw new ProviderError("rate_limit", "Mock rate limit.", 429);
    if (text.includes("[mock:ambiguous]")) throw new ProviderError("ambiguous", "Mock timeout.");
    if (text.includes("[mock:bad_request]")) throw new ProviderError("bad_request", "Mock bad request.", 400);
    if (text.includes("[mock:fail-once]")) await failOnce(text);
    // [mock:slow] makes the call take a while so tests can act on a run that is still in progress.
    if (text.includes("[mock:slow]")) await new Promise((resolve) => setTimeout(resolve, 7000));
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

// ---------- Research pipeline responders (spec.name → deterministic output derived from the prompt) ----------

interface MockSource {
    id: string;
    url: string;
    body: string;
}

function parseSources(prompt: string): MockSource[] {
    const out: MockSource[] = [];
    const re = /<<<SOURCE id=(\S+) url=(\S+?)>>>\n([\s\S]*?)\n<<<END SOURCE \1>>>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(prompt))) out.push({ id: m[1], url: m[2], body: m[3].replace(/^Title:[^\n]*\n/, "") });
    return out;
}

const firstSentence = (text: string) => {
    const line = text.split("\n").find((l) => l.trim().length >= 20) ?? text;
    const end = line.search(/[.!?](\s|$)/);
    return (end > 15 ? line.slice(0, end + 1) : line).slice(0, 200).trim();
};

function researchResponse(name: string, request: AIRequest): unknown {
    const full = `${request.system ?? ""}\n${request.prompt}`;

    if (name === "research_extract") {
        return {
            articles: parseSources(request.prompt).map((s) => ({
                id: s.id,
                relevance: s.body.includes("[mock:irrelevant]") ? 0.05 : 0.9,
                claims: s.body.includes("[mock:no-claims]") ? [] : [{ claim: firstSentence(s.body), quote: firstSentence(s.body) }],
            })),
        };
    }

    if (name === "research_draft") {
        const claimRe = /^- \[(\S+?)\] (.+?) \(quote: "/gm;
        const claims: Array<{ id: string; claim: string }> = [];
        let m: RegExpExecArray | null;
        while ((m = claimRe.exec(request.prompt))) claims.push({ id: m[1], claim: m[2] });
        const ids = Array.from(new Set(claims.map((c) => c.id)));
        const ordinals = ["the first source", "the second source", "the third source", "the fourth source", "the fifth source", "the sixth source"];
        const domains = ids.map((_, i) => ordinals[i] ?? "another source").join(" and ");
        let post = `According to ${domains}, ${claims.map((c) => c.claim.replace(/[.!?]+$/, "")).join(". Also, ")}. This matters for teams building with AI today and it is worth watching closely.`;
        // Company context (uploaded by the author) reached the prompt: echo its first sentence so tests can see it was used.
        const ctx = request.prompt.match(/<<<COMPANY_CONTEXT>>>\n([\s\S]*?)\n<<<END COMPANY_CONTEXT>>>/)?.[1];
        if (ctx) post += ` ${firstSentence(ctx.replace(/^## [^\n]*\n/, ""))}`;
        if (full.includes("[mock:invent-number]")) post += " Revenue grew 73% last year.";
        if (full.includes("[mock:unsupported]")) post += " It will certainly transform every industry overnight.";
        if (full.includes("[mock:leak]")) post += " <<<SOURCE id=x>>>";
        return { post, hashtags: ["AI", "Tech"], sourceIds: ids.length ? ids : ["s1"] };
    }

    if (name === "persona_demo") {
        const topics = (request.prompt.match(/covers: ([^.]+)\./)?.[1] ?? "work").split(",").map((t) => t.trim());
        return {
            drafts: [0, 1].map((i) => ({
                angle: `Lesson ${i + 1} about ${topics[i % topics.length]}`,
                post: `Here is a practical lesson about ${topics[i % topics.length]} that teams learn the hard way. Start small, measure what matters, and keep a human in the loop for anything risky. What would you add?`,
                hashtags: ["Demo", "Learning"],
            })),
        };
    }

    if (name === "research_check") {
        const postText = request.prompt.split("\n\n<<<SOURCE")[0].replace(/^POST:\n/, "");
        const sources = parseSources(request.prompt);
        const supported = sources[0] ? firstSentence(sources[0].body) : undefined;
        const claims = [{ text: postText.slice(0, 120), supported: !postText.includes("[mock:unsupported]") && !postText.includes("transform every industry"), quote: supported }];
        return { claims };
    }
    return undefined;
}

export function mockProvider(id: ProviderId): AIProvider {
    return {
        id,
        async generateText(request): Promise<AIResult> {
            await failIfAsked(request);
            const text = `Mock ${id} response for: ${request.prompt.slice(0, 80)}`;
            return { text, usage: usageFor(request, text), model: request.model, provider: id };
        },
        async generateStructured<T>(request: AIRequest, spec: StructuredSpec<T>): Promise<StructuredAIResult<T>> {
            await failIfAsked(request);
            const text = JSON.stringify(researchResponse(spec.name, request) ?? sampleFor(spec.schema));
            return { text, usage: usageFor(request, text), model: request.model, provider: id, data: parseStructured(text, spec) };
        },
        ...(id === "gemini" ?
            {
                async search(request: AIRequest): Promise<GroundedResult> {
                    await failIfAsked(request);
                    const urls = Array.from(request.prompt.matchAll(/\[mock:url=(\S+?)\]/g)).map((m) => m[1]);
                    const text = `Mock grounded answer about: ${request.prompt.slice(0, 60)}`;
                    return {
                        text,
                        usage: usageFor(request, text),
                        model: request.model,
                        provider: id,
                        sources: urls.map((u, i) => ({ url: u, title: `Mock result ${i + 1}` })),
                        queries: ["mock query"],
                        extraCostMicroUsd: GROUNDING_COST_MICRO_USD_PER_QUERY,
                    };
                },
            } :
            {}),
        async validateKey(apiKey) {
            if (!apiKey.startsWith("test-valid")) throw new ProviderError("auth", "Mock: key rejected.", 401);
        },
    };
}
