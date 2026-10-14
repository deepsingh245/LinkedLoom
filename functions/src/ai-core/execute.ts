import { randomUUID } from "crypto";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { releaseReservation, reserveCredits, settleReservation } from "../billing/credits";
import { resolveConnectionKey } from "./connections-store";
import { costMicroUsd, estimateMaxCredits, microUsdToCredits, PRICE_VERSION } from "./pricing";
import { getProvider } from "./providers";
import { isMockEnabled } from "./providers/mock";
import { errorMessage } from "./redact";
import { DEFAULT_MANAGED_PROVIDER, resolveModel } from "./registry";
import { consumeDailyQuota, recordUsage, UsageStatus } from "./usage";
import {
    AIRequest,
    AIResult,
    BillingMode,
    GroundedResult,
    ModelProfile,
    ProviderError,
    ProviderId,
    StructuredAIResult,
    StructuredSpec,
} from "./types";

const TIMEOUT_MS = 60_000;
const BYOK_DAILY_CALLS = Number(process.env.BYOK_DAILY_CALL_CAP || 200);

export interface RunContext {
    workspaceId: string;
    uid: string;
    /** e.g. "editor.generatePost", "autopilot.testGenerate" */
    feature: string;
    personaId?: string;
    /** BYOK connection; omitted = managed (LinkedLoom key). */
    connectionId?: string;
    modelProfile?: ModelProfile;
    /** Pin an exact managed model (editor keeps its current model). */
    managedModel?: { provider: ProviderId; model: string };
    /** Managed calls only: charge credits (Autopilot) or just meter (existing editor features). */
    chargeCredits: boolean;
    personaMonthlyLimit?: number;
    /** Optional per-workspace daily cap for this feature. */
    dailyCap?: { bucket: string; cap: number; message: string };
    idempotencyKey?: string;
}

export interface RunPrompt {
    /** Upper bound of non-token charges (e.g. grounding queries) so the credit reservation covers them. */
    extraMaxCostMicroUsd?: number;
    prompt: string;
    system?: string;
    maxOutputTokens: number;
    temperature?: number;
}

export interface RunMeta {
    provider: ProviderId;
    model: string;
    billingMode: BillingMode;
    credits: number;
    idempotencyKey: string;
}

const MANAGED_KEYS: Record<ProviderId, string> = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY" };

function managedKey(provider: ProviderId): string {
    const key = process.env[MANAGED_KEYS[provider]];
    if (key) return key;
    if (isMockEnabled()) return "mock-managed-key";
    throw new HttpsError("failed-precondition", `${MANAGED_KEYS[provider]} is not configured.`);
}

function toHttpsError(error: ProviderError, billingMode: BillingMode): HttpsError {
    switch (error.kind) {
    case "auth":
        return billingMode === "byok" ?
            new HttpsError("failed-precondition", "Your AI provider rejected the API key. Test or replace the connection.") :
            new HttpsError("internal", "AI service configuration error.");
    case "rate_limit":
        return new HttpsError("resource-exhausted", "The AI provider is busy or out of quota. Please try again shortly.");
    case "ambiguous":
        return new HttpsError("deadline-exceeded", "The AI request timed out. Please try again.");
    case "bad_output":
        return new HttpsError("internal", "The AI returned an unexpected response. Please try again.");
    default:
        return new HttpsError("internal", "The AI request failed. Please try again.");
    }
}

async function run<R extends AIResult>(
    ctx: RunContext,
    prompt: RunPrompt,
    call: (provider: ReturnType<typeof getProvider>, request: AIRequest, apiKey: string) => Promise<R>
): Promise<R & { meta: RunMeta }> {
    const idempotencyKey = ctx.idempotencyKey ?? randomUUID();

    // 1. Credentials + model
    let provider: ProviderId;
    let apiKey: string;
    let billingMode: BillingMode;
    let model: string;
    if (ctx.connectionId) {
        const resolved = await resolveConnectionKey(ctx.workspaceId, ctx.connectionId);
        provider = resolved.provider;
        apiKey = resolved.apiKey;
        billingMode = "byok";
        model = resolveModel(provider, ctx.modelProfile ?? "balanced").id;
    } else {
        provider = ctx.managedModel?.provider ?? DEFAULT_MANAGED_PROVIDER;
        model = ctx.managedModel?.model ?? resolveModel(provider, ctx.modelProfile ?? "balanced").id;
        apiKey = managedKey(provider);
        billingMode = "managed";
    }

    // 2. Quotas (abuse protection; BYOK still uses our infrastructure)
    if (ctx.dailyCap) await consumeDailyQuota(ctx.workspaceId, ctx.dailyCap.bucket, ctx.dailyCap.cap, ctx.dailyCap.message);
    if (billingMode === "byok") {
        await consumeDailyQuota(ctx.workspaceId, "byok", BYOK_DAILY_CALLS, "Daily AI call limit for your own keys reached. Try again tomorrow.");
    }

    // 3. Reserve credits for the worst case
    const charge = billingMode === "managed" && ctx.chargeCredits;
    const promptChars = prompt.prompt.length + (prompt.system?.length ?? 0);
    const reservationId = charge ?
        await reserveCredits(ctx.workspaceId, {
            amount: estimateMaxCredits(model, promptChars, prompt.maxOutputTokens) + microUsdToCredits(prompt.extraMaxCostMicroUsd ?? 0),
            idempotencyKey,
            feature: ctx.feature,
            personaId: ctx.personaId,
            personaMonthlyLimit: ctx.personaMonthlyLimit,
        }) :
        undefined;

    const base = {
        feature: ctx.feature,
        uid: ctx.uid,
        ...(ctx.personaId ? { personaId: ctx.personaId } : {}),
        provider,
        model,
        billingMode,
        priceVersion: PRICE_VERSION,
        ...(reservationId ? { reservationId } : {}),
    };

    // 4. Call the provider
    const request: AIRequest = { model, prompt: prompt.prompt, system: prompt.system, maxOutputTokens: prompt.maxOutputTokens, temperature: prompt.temperature };
    let result: R;
    try {
        result = await call(getProvider(provider), request, apiKey);
    } catch (error) {
        const providerError = error instanceof ProviderError ? error : new ProviderError("ambiguous", errorMessage(error, [apiKey]));
        // Never charge on failure. Ambiguous outcomes are absorbed by us and flagged for reconciliation.
        if (reservationId) await releaseReservation(ctx.workspaceId, reservationId, providerError.kind);
        const status: UsageStatus = providerError.kind === "ambiguous" ? "ambiguous" : "failed";
        await recordUsage(ctx.workspaceId, idempotencyKey, {
            ...base,
            usage: { inputTokens: 0, outputTokens: 0 },
            costMicroUsd: 0,
            credits: 0,
            status,
            error: `${providerError.kind}: ${errorMessage(providerError, [apiKey])}`,
        });
        logger.warn("AI call failed", { feature: ctx.feature, provider, model, billingMode, kind: providerError.kind, workspaceId: ctx.workspaceId });
        throw toHttpsError(providerError, billingMode);
    }

    // 5. Settle actual cost + meter
    const cost = costMicroUsd(model, result.usage) + (result.extraCostMicroUsd ?? 0);
    const credits = reservationId ? await settleReservation(ctx.workspaceId, reservationId, microUsdToCredits(cost)) : 0;
    await recordUsage(ctx.workspaceId, idempotencyKey, { ...base, usage: result.usage, costMicroUsd: cost, credits, status: "ok" });

    return { ...result, meta: { provider, model, billingMode, credits, idempotencyKey } };
}

export function runAI(ctx: RunContext, prompt: RunPrompt) {
    return run(ctx, prompt, (provider, request, apiKey) => provider.generateText(request, { apiKey, timeoutMs: TIMEOUT_MS }));
}

/** Web-search grounded generation (Gemini). Callers should check the persona's provider first; this fails cleanly otherwise. */
export function runAIGrounded(ctx: RunContext, prompt: RunPrompt): Promise<GroundedResult & { meta: RunMeta }> {
    return run(ctx, prompt, (provider, request, apiKey) => {
        if (!provider.search) throw new ProviderError("bad_request", `${provider.id} doesn't support web search grounding.`);
        return provider.search(request, { apiKey, timeoutMs: TIMEOUT_MS });
    });
}

export function runAIStructured<T>(ctx: RunContext, prompt: RunPrompt, spec: StructuredSpec<T>): Promise<StructuredAIResult<T> & { meta: RunMeta }> {
    return run(ctx, prompt, (provider, request, apiKey) => provider.generateStructured(request, spec, { apiKey, timeoutMs: TIMEOUT_MS }));
}
