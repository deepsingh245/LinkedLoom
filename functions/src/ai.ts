import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({ 
  project: process.env.PROJECT_ID || 'linkedloom', 
  location: 'us-central1' 
});

const imageModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
});

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
                error?.status === 'RESOURCE_EXHAUSTED' ||
                error?.message?.includes('429');

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

        try {
            const parts: any[] = [{ text: prompt }];
            
            if (referenceImage && typeof referenceImage === "string") {
                // Remove data:image/...;base64, prefix if present
                const base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, "");
                parts.push({
                    inlineData: {
                        mimeType: "image/png", // Defaulting to png, should ideally be dynamic
                        data: base64Data
                    }
                });
            }

            const result = await retryWithBackoff(() =>
                imageModel.generateContent({
                    contents: [{
                        role: "user",
                        parts: parts
                    }],
                    // Add "as any" to bypass the outdated TypeScript interface
                    generationConfig: {
                        responseModalities: ["IMAGE"] 
                    } as any 
                })
            );

            const response = await result.response;
            const base64Image = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!base64Image) {
                throw new Error("No image data returned.");
            }

            return { imageUrl: `data:image/png;base64,${base64Image}` };
        } catch (error: any) {
            console.error("Image Generation Error:", error);

            const isRateLimited =
                error?.code === 429 ||
                error?.status === 'RESOURCE_EXHAUSTED' ||
                error?.message?.includes('429');

            throw new HttpsError(
                isRateLimited ? "resource-exhausted" : "internal",
                isRateLimited
                    ? "Rate limit exceeded. Please wait a moment and try again."
                    : "Failed to generate image."
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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const result = await model.generateContent(
                `You are an expert AI image prompt engineer. Rewrite the following image prompt to be more detailed, vivid, and optimized for AI image generation. Add specific details about style, lighting, composition, colors, and mood. Keep it under 200 words. Do NOT use any markdown formatting. Return ONLY the enhanced prompt text, nothing else.\n\nOriginal prompt: "${prompt}"`
            );

            const enhanced = result.response.text().trim();
            return { enhancedPrompt: enhanced };
        } catch (error: any) {
            console.error("Enhance Prompt Error:", error);
            throw new HttpsError("internal", "Failed to enhance prompt.");
        }
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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError(
                "failed-precondition",
                "GEMINI_API_KEY is not configured.  "
            );
        }

        const data = request.data;
        const { topic, tone, length } = data;

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

        const prompt = getPrompt(topic, tone, length);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
            });

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            return { content: text };
        } catch (error: any) {
            console.error("Gemini Generation Error:", error);

            throw new HttpsError(
                "internal",
                "Failed to generate post.",
                error.message
            );
        }
    }
);

function getPrompt(
    topic: string,
    tone?: string,
    length?: number
): string {
    return `
You are a professional LinkedIn content writer.

Write a LinkedIn post about "${topic}".

Tone: ${tone || "professional"}
Length: ${length ? `${length} words` : "short (100-150 words)"}

Requirements:
- Use short paragraphs
- Add emojis where appropriate
- Make it engaging and practical
- Do NOT use any markdown formatting. No bold (**), no italics (*), no headers (#, ##), no bullet points with dashes. Write in plain text only.
- End the post with 3-5 relevant hashtags on a new line (e.g. #Leadership #CareerGrowth #Tech)
`;
}

