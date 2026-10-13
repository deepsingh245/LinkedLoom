import { describe, expect, it } from "vitest";
import { z } from "zod";
import { costMicroUsd, creditsFor, estimateMaxCredits, microUsdToCredits, priceFor } from "../src/ai-core/pricing";
import { keyHint, redact } from "../src/ai-core/redact";
import { resolveModel } from "../src/ai-core/registry";
import { parseStructured, toProviderJsonSchema } from "../src/ai-core/providers/structured";
import { ProviderError } from "../src/ai-core/types";

describe("pricing", () => {
    it("computes micro-USD cost from per-million prices", () => {
        const p = priceFor("gemini-2.5-flash-lite");
        expect(costMicroUsd("gemini-2.5-flash-lite", { inputTokens: 1_000_000, outputTokens: 0 })).toBe(Math.ceil(p.inputPerMTok * 1_000_000));
        expect(costMicroUsd("gemini-2.5-flash-lite", { inputTokens: 0, outputTokens: 0 })).toBe(0);
    });

    it("charges at least 1 credit for any usage and 0 for none", () => {
        expect(microUsdToCredits(0)).toBe(0);
        expect(microUsdToCredits(1)).toBe(1);
        expect(creditsFor("gemini-2.5-flash-lite", { inputTokens: 10, outputTokens: 10 })).toBe(1);
    });

    it("prices unknown models conservatively (never cheaper than known ones)", () => {
        const known = creditsFor("gpt-5.5", { inputTokens: 100_000, outputTokens: 100_000 });
        const unknown = creditsFor("some-new-model", { inputTokens: 100_000, outputTokens: 100_000 });
        expect(unknown).toBeGreaterThanOrEqual(known);
    });

    it("max estimate always covers actual usage within the output limit", () => {
        const prompt = "x".repeat(2000);
        const estimate = estimateMaxCredits("gemini-2.5-pro", prompt.length, 1024);
        const actual = creditsFor("gemini-2.5-pro", { inputTokens: 500, outputTokens: 1024 });
        expect(estimate).toBeGreaterThanOrEqual(actual);
    });
});

describe("registry", () => {
    it("maps every provider/profile to a model", () => {
        for (const provider of ["gemini", "openai"] as const) {
            for (const profile of ["economy", "balanced", "quality"] as const) {
                const m = resolveModel(provider, profile);
                expect(m.provider).toBe(provider);
                expect(m.id.length).toBeGreaterThan(0);
                expect(priceFor(m.id)).toBeTruthy();
            }
        }
    });
});

describe("redaction", () => {
    it("removes API keys and bearer tokens", () => {
        const text = "failed with sk-abcdefghijklmnop1234 and AIzaSyA1234567890abcdefghijklmnop and Bearer abc.def.ghi123 ?key=secret123";
        const out = redact(text);
        expect(out).not.toContain("sk-abcdefghijklmnop1234");
        expect(out).not.toContain("AIzaSyA1234567890abcdefghijklmnop");
        expect(out).not.toContain("abc.def.ghi123");
        expect(out).not.toContain("secret123");
        expect(out).toContain("Bearer [REDACTED]");
    });

    it("removes explicitly provided secrets", () => {
        expect(redact("bad key my-custom-key-value", ["my-custom-key-value"])).toBe("bad key [REDACTED]");
    });

    it("shows only the last 4 characters of a key", () => {
        expect(keyHint("sk-1234567890abcd")).toBe("••••abcd");
    });
});

describe("structured output", () => {
    const spec = { name: "draft", schema: z.object({ post: z.string(), hashtags: z.array(z.string()) }) };

    it("produces a provider JSON schema without $schema", () => {
        const schema = toProviderJsonSchema(spec);
        expect(schema.$schema).toBeUndefined();
        expect(schema.type).toBe("object");
        expect(schema.additionalProperties).toBe(false);
    });

    it("validates model output and rejects bad JSON or shape", () => {
        expect(parseStructured('{"post":"hi","hashtags":["a"]}', spec)).toEqual({ post: "hi", hashtags: ["a"] });
        expect(() => parseStructured("not json", spec)).toThrow(ProviderError);
        expect(() => parseStructured('{"post":1}', spec)).toThrow(ProviderError);
    });
});
