import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { VertexAI } from "@google-cloud/vertexai";
import { runAI } from "./ai-core/execute";
import { costMicroUsd, PRICE_VERSION } from "./ai-core/pricing";
import { consumeDailyQuota, recordUsage } from "./ai-core/usage";
import { errorMessage } from "./ai-core/redact";
import { ensureWorkspace } from "./autopilot/workspace";
import { randomUUID } from "crypto";

// Editor AI features are metered (usage records + daily caps) but never charged credits.
const EDITOR_TEXT_MODEL = { provider: "gemini" as const, model: "gemini-2.5-flash-lite" };
const IMAGE_MODEL = "gemini-2.5-flash-image";
const TEXT_DAILY_CAP = Number(process.env.EDITOR_TEXT_DAILY_CAP || 100);
const IMAGE_DAILY_CAP = Number(process.env.EDITOR_IMAGE_DAILY_CAP || 30);

const textCap = {
    bucket: "editor.text",
    cap: TEXT_DAILY_CAP,
    message: `You've reached today's limit of ${TEXT_DAILY_CAP} AI text generations. Try again tomorrow.`,
};

// Lazy: Vertex AI is heavy to load and only needed for image generation.
let imageModelInstance: ReturnType<VertexAI["getGenerativeModel"]> | undefined;
const getImageModel = () => {
    if (!imageModelInstance) {
        const { VertexAI: Vertex } = require("@google-cloud/vertexai") as typeof import("@google-cloud/vertexai");
        imageModelInstance = new Vertex({
            project: process.env.PROJECT_ID || "linkedloom",
            location: "us-central1",
        }).getGenerativeModel({ model: IMAGE_MODEL });
    }
    return imageModelInstance;
};

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelayMs = 2000
): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const isRateLimited =
                error?.code === 429 ||
                error?.status === "RESOURCE_EXHAUSTED" ||
                error?.message?.includes("429");

            if (!isRateLimited || attempt === maxRetries) {
                throw error;
            }

            const delay = initialDelayMs * Math.pow(2, attempt);
            console.warn(`Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

export const generateImage = onCall(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be logged in."
            );
        }

        const { prompt, referenceImage } = request.data;

        if (!prompt || typeof prompt !== "string") {
            throw new HttpsError(
                "invalid-argument",
                "Prompt is required."
            );
        }

        const uid = request.auth.uid;
        const workspaceId = await ensureWorkspace(uid);
        await consumeDailyQuota(
            workspaceId,
            "editor.image",
            IMAGE_DAILY_CAP,
            `You've reached today's limit of ${IMAGE_DAILY_CAP} AI images. Try again tomorrow.`
        );
        const idempotencyKey = randomUUID();
        const usageBase = {
            feature: "editor.generateImage",
            uid,
            provider: "gemini" as const,
            model: IMAGE_MODEL,
            billingMode: "managed" as const,
            credits: 0,
            priceVersion: PRICE_VERSION,
        };

        try {
            const parts: any[] = [{ text: prompt }];

            if (referenceImage && typeof referenceImage === "string") {
                // Remove data:image/...;base64, prefix if present
                const base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, "");
                parts.push({
                    inlineData: {
                        mimeType: "image/png", // Defaulting to png, should ideally be dynamic
                        data: base64Data,
                    },
                });
            }

            const result = await retryWithBackoff(() =>
                getImageModel().generateContent({
                    contents: [{
                        role: "user",
                        parts: parts,
                    }],
                    // Add "as any" to bypass the outdated TypeScript interface
                    generationConfig: {
                        responseModalities: ["IMAGE"],
                    } as any,
                })
            );

            const response = await result.response;
            const base64Image = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!base64Image) {
                throw new Error("No image data returned.");
            }

            const usage = {
                inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
            };
            await recordUsage(workspaceId, idempotencyKey, {
                ...usageBase,
                usage,
                costMicroUsd: costMicroUsd(IMAGE_MODEL, usage),
                status: "ok",
            });

            return { imageUrl: `data:image/png;base64,${base64Image}` };
        } catch (error: any) {
            console.error("Image Generation Error:", errorMessage(error));

            const isRateLimited =
                error?.code === 429 ||
                error?.status === "RESOURCE_EXHAUSTED" ||
                error?.message?.includes("429");

            await recordUsage(workspaceId, idempotencyKey, {
                ...usageBase,
                usage: { inputTokens: 0, outputTokens: 0 },
                costMicroUsd: 0,
                status: "failed",
                error: errorMessage(error),
            });

            throw new HttpsError(
                isRateLimited ? "resource-exhausted" : "internal",
                isRateLimited ?
                    "Rate limit exceeded. Please wait a moment and try again." :
                    "Failed to generate image."
            );
        }
    }
);

export const enhanceImagePrompt = onCall(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be logged in.");
        }

        const { prompt } = request.data;
        if (!prompt || typeof prompt !== "string") {
            throw new HttpsError("invalid-argument", "Prompt is required.");
        }

        const uid = request.auth.uid;
        const workspaceId = await ensureWorkspace(uid);
        const result = await runAI(
            { workspaceId, uid, feature: "editor.enhanceImagePrompt", managedModel: EDITOR_TEXT_MODEL, chargeCredits: false, dailyCap: textCap },
            {
                prompt: `You are an expert AI image prompt engineer. Rewrite the following image prompt to be more detailed, vivid, and optimized for AI image generation. Add specific details about style, lighting, composition, colors, and mood. Keep it under 200 words. Do NOT use any markdown formatting. Return ONLY the enhanced prompt text, nothing else.\n\nOriginal prompt: "${prompt}"`,
                maxOutputTokens: 512,
            }
        );

        return { enhancedPrompt: result.text.trim() };
    }
);

export const generatePost = onCall(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be logged in."
            );
        }

        const data = request.data;
        const { topic, tone, length, excludeIcons, creativeExpansion } = data;

        if (!topic) {
            throw new HttpsError(
                "invalid-argument",
                "Topic is required."
            );
        }

        if (length && typeof length !== "number") {
            throw new HttpsError(
                "invalid-argument",
                "Length must be a number."
            );
        }

        const prompt = getPrompt(topic, tone, length, excludeIcons, creativeExpansion);
        const uid = request.auth.uid;
        const workspaceId = await ensureWorkspace(uid);

        const result = await runAI(
            { workspaceId, uid, feature: "editor.generatePost", managedModel: EDITOR_TEXT_MODEL, chargeCredits: false, dailyCap: textCap },
            // ~4 chars per token; leave generous room above the requested length.
            { prompt, maxOutputTokens: Math.min(4096, Math.max(1024, Math.ceil((length || 800) / 2))) }
        );

        return { content: result.text };
    }
);

function getPrompt(
    topic: string,
    tone?: string,
    length?: number,
    excludeIcons?: boolean,
    creativeExpansion?: boolean
): string {
    let prompt = `You are a professional LinkedIn content writer.

Write a LinkedIn post about "${topic}".

Tone: ${tone || "professional"}
Length: Approximately ${length || 800} characters.

Requirements:
- Use short paragraphs
`;

    if (excludeIcons) {
        prompt += "- Do NOT use any emojis or icons. Use text only.\n";
    } else {
        prompt += "- Add emojis where appropriate\n";
    }

    if (creativeExpansion) {
        prompt += "- Be creative and add more original ideas, anecdotes, or elaboration from yourself to expand the topic.\n";
    }

    prompt += `- Make it engaging and practical
- Do NOT use any markdown formatting. No bold (**), no italics (*), no headers (#, ##), no bullet points with dashes. Write in plain text only.
- End the post with 3-5 relevant hashtags on a new line (e.g. #Leadership #CareerGrowth #Tech)
`;
    return prompt;
}
