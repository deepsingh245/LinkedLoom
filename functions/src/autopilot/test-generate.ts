import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { runAIStructured } from "../ai-core/execute";
import { parse, requireUid } from "../shared/callable";
import { personaIdSchema } from "./schema";
import { ensureWorkspace, personasRef, settingsRef, writeAudit } from "./workspace";
import { CONTEXT_RULE, contextBlock, loadContextText } from "./context/store";

const inputSchema = z.object({
    personaId: personaIdSchema,
    topic: z.string().trim().max(200).optional(),
}).strict();

const draftSchema = z.object({
    post: z.string().min(1).max(3000),
    hashtags: z.array(z.string().max(60)).max(8),
});

function buildPrompt(persona: FirebaseFirestore.DocumentData, topic: string, companyContext = "") {
    const { identity, research } = persona;
    const system = [
        `You write LinkedIn posts as: ${identity.role}.`,
        `Audience: ${identity.targetAudience}. Tone: ${identity.tone}. Language: ${identity.language}.`,
        research.excludedTopics?.length ? `Never write about: ${research.excludedTopics.join(", ")}.` : "",
        identity.customInstructions ? `Author's instructions (style only, not facts): ${identity.customInstructions}` : "",
        "Write plain text (no markdown), 120-220 words, with a strong first line. Don't invent statistics, quotes or news.",
        "Return JSON with `post` and up to 5 `hashtags` (without the # symbol).",
        companyContext ? CONTEXT_RULE : "",
    ].filter(Boolean).join("\n");
    return { system, prompt: `${companyContext ? `${contextBlock(companyContext)}\n\n` : ""}Write one post about: ${topic}` };
}

/**
 * Generate one sample post with a persona's voice, model profile and billing (managed credits or BYOK).
 * Nothing is stored or published – this exists to try a persona before research/drafting (A3).
 */
export const testPersonaGeneration = onCall({ timeoutSeconds: 120 }, async (request) => {
    const uid = requireUid(request);
    const { personaId, topic } = parse(inputSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);

    const settings = (await settingsRef(workspaceId).get()).data();
    if (settings?.autopilotEnabled === false) {
        throw new HttpsError("failed-precondition", "Autopilot is stopped. Turn it on to generate.");
    }
    const snap = await personasRef(workspaceId).doc(personaId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Persona not found.");
    const persona = snap.data()!;
    if (persona.status === "archived") throw new HttpsError("failed-precondition", "Restore the persona first.");

    const chosenTopic = topic || persona.research.topics[0];
    const { system, prompt } = buildPrompt(persona, chosenTopic, await loadContextText(workspaceId, personaId).catch(() => ""));

    const result = await runAIStructured(
        {
            workspaceId,
            uid,
            feature: "autopilot.testGenerate",
            personaId,
            connectionId: persona.ai.connectionId,
            modelProfile: persona.ai.modelProfile,
            chargeCredits: true,
            personaMonthlyLimit: persona.ai.monthlyCreditLimit,
        },
        { system, prompt, maxOutputTokens: 1024, temperature: 0.8 },
        { name: "linkedin_draft", schema: draftSchema }
    );

    await writeAudit(workspaceId, uid, "persona.testGenerate", personaId, {
        provider: result.meta.provider,
        credits: result.meta.credits,
    });
    return {
        topic: chosenTopic,
        post: result.data.post,
        hashtags: result.data.hashtags.map((h) => h.replace(/^#/, "")),
        provider: result.meta.provider,
        model: result.meta.model,
        billingMode: result.meta.billingMode,
        credits: result.meta.credits,
        usage: result.usage,
    };
});
