import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generatePost = onCall(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be logged in."
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        console.log("🚀 ~ apiKey:", apiKey)
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
- Do NOT include hashtags unless explicitly requested
- Make it engaging and practical
`;
}