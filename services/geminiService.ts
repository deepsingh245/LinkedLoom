import { GoogleGenAI } from "@google/genai";
import { Tone } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a world-class LinkedIn ghostwriter and social media strategist. 
Your goal is to write high-engagement LinkedIn posts based on user topics.

Follow these formatting rules strictly:
1. Use short paragraphs (1-2 sentences max).
2. Use a "Hook" in the first line to grab attention.
3. Use bullet points or emojis where appropriate for readability.
4. End with a "Call to Action" (CTA) question to drive comments.
5. Do not include hashtags unless specifically asked.
6. Keep the tone consistent with the requested style.

Tone Guidelines:
- Professional: Informative, polished, corporate but not boring.
- Casual: Friendly, relatable, conversational, uses 'I' and 'You'.
- Viral: Punchy, short sentences, slight clickbait, high energy, strong hook.
- Thought Leader: Visionary, insightful, authoritative, "Here is what I learned".
- Controversial: Challenges status quo, bold, definitive statements.
`;

export const generatePost = async (topic: string, tone: Tone): Promise<string> => {
  try {
    const model = "gemini-2.5-flash";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `Write a LinkedIn post about: "${topic}". \nTone: ${tone}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7, // Balance creativity and coherence
        maxOutputTokens: 1000,
      }
    });

    if (response.text) {
      return response.text;
    }
    
    throw new Error("No content generated.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
