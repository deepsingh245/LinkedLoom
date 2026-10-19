import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { runAIStructured } from "../ai-core/execute";
import { consumeDailyQuota } from "../ai-core/usage";
import { parse, requireUid } from "../shared/callable";
import { personaIdSchema } from "./schema";
import { envNum } from "./research/types";
import { ensureWorkspace, personasRef, settingsRef, workspaceRef, writeAudit } from "./workspace";

/** How many demos a workspace can run per day (each costs one AI call). */
const DEMO_DAILY_CAP = envNum("AUTOPILOT_DEMO_DAILY_CAP", 10);
export const DEMO_DRAFTS = 2;

const inputSchema = z.object({ personaId: personaIdSchema }).strict();

export const demoSchema = z.object({
    drafts: z
        .array(z.object({
            angle: z.string().min(3).max(200),
            post: z.string().min(40).max(3000),
            hashtags: z.array(z.string().max(60)).max(6),
        }))
        .min(1)
        .max(DEMO_DRAFTS),
});

export const demoDraftId = (personaId: string, index: number) => `demo_${personaId}_${index}`;

function buildPrompt(persona: FirebaseFirestore.DocumentData) {
    const { identity, research } = persona;
    const system = [
        `You write LinkedIn posts as: ${identity.role}.`,
        `Audience: ${identity.targetAudience}. Tone: ${identity.tone}. Language: ${identity.language}.`,
        research.excludedTopics?.length ? `Never write about: ${research.excludedTopics.join(", ")}.` : "",
        identity.customInstructions ? `Author's style notes (style only, not facts): ${identity.customInstructions}` : "",
        "These are DEMO drafts that show the author how their review queue will look. They are not based on research,",
        "so do not state specific statistics, dates, quotes, company announcements or news as facts. Write experience-based",
        "insights, practical advice or opinions instead. Plain text, no markdown, 100-180 words each, strong first line.",
        `Return JSON with exactly ${DEMO_DRAFTS} drafts on DIFFERENT angles; each has a short \`angle\`, the \`post\`, and up to 5 \`hashtags\` (without #).`,
    ].filter(Boolean).join("\n");
    const topics = (research.topics as string[]).slice(0, 5).join(", ");
    return { system, prompt: `Topics this author covers: ${topics}. Write ${DEMO_DRAFTS} sample posts.` };
}

/**
 * "Try a demo": instantly write sample drafts in a persona's voice and put them in the approval queue
 * (marked `demo: true`), so the user can see and practise how drafts will arrive for review.
 * One AI call (credits or the persona's own key). Re-running replaces the previous demo drafts.
 * Demo drafts are not researched or fact-checked, and don't count towards the scheduling pause.
 */
export const runPersonaDemo = onCall({ timeoutSeconds: 120 }, async (request) => {
    const uid = requireUid(request);
    const { personaId } = parse(inputSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);

    const settings = (await settingsRef(workspaceId).get()).data();
    if (settings?.autopilotEnabled === false) {
        throw new HttpsError("failed-precondition", "Autopilot is stopped. Turn it on to try a demo.");
    }
    const snap = await personasRef(workspaceId).doc(personaId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Persona not found.");
    const persona = snap.data()!;
    if (persona.status === "archived") throw new HttpsError("failed-precondition", "Restore the persona first.");

    await consumeDailyQuota(workspaceId, "autopilot.demo", DEMO_DAILY_CAP, `You've reached today's limit of ${DEMO_DAILY_CAP} demos. Try again tomorrow.`);

    const { system, prompt } = buildPrompt(persona);
    const result = await runAIStructured(
        {
            workspaceId,
            uid,
            feature: "autopilot.demo",
            personaId,
            connectionId: persona.ai.connectionId,
            modelProfile: persona.ai.modelProfile,
            chargeCredits: true,
            personaMonthlyLimit: persona.ai.monthlyCreditLimit,
        },
        { system, prompt, maxOutputTokens: 2048, temperature: 0.8 },
        { name: "persona_demo", schema: demoSchema }
    );

    // Deterministic ids: a new demo replaces the previous one instead of piling up in the queue.
    const contentCol = workspaceRef(workspaceId).collection("contentItems");
    const batch = contentCol.firestore.batch();
    const draftIds: string[] = [];
    for (let i = 0; i < DEMO_DRAFTS; i++) {
        const ref = contentCol.doc(demoDraftId(personaId, i));
        const draft = result.data.drafts[i];
        if (!draft) {
            batch.delete(ref);
            continue;
        }
        const hashtags = draft.hashtags.map((h) => h.replace(/^#/, "").trim()).filter(Boolean);
        draftIds.push(ref.id);
        batch.set(ref, {
            id: ref.id,
            personaId,
            runId: "demo",
            demo: true,
            personaVersion: persona.version,
            topic: draft.angle.slice(0, 200),
            tone: String(persona.identity.tone).toUpperCase(),
            masterDraft: draft.post,
            hashtags,
            variants: { linkedin: { text: draft.post, status: "draft" } },
            sources: [],
            claims: [],
            qualityScore: null,
            verification: { deterministic: "skipped", ai: "skipped", claimsChecked: 0 },
            state: "PENDING_APPROVAL",
            approvalStatus: "pending",
            version: 1,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();

    await writeAudit(workspaceId, uid, "persona.demo", personaId, { drafts: draftIds.length, credits: result.meta.credits });
    return {
        draftIds,
        drafts: result.data.drafts.map((d) => ({ angle: d.angle, post: d.post, hashtags: d.hashtags.map((h) => h.replace(/^#/, "")) })),
        provider: result.meta.provider,
        model: result.meta.model,
        billingMode: result.meta.billingMode,
        credits: result.meta.credits,
    };
});
