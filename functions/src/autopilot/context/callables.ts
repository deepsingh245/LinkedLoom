import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { parse, requireUid } from "../../shared/callable";
import { personaIdSchema } from "../schema";
import { ensureWorkspace, personasRef, writeAudit } from "../workspace";
import { cleanContextText, CONTEXT_LIMITS as L, contextDocsRef, contextTextsRef, looksBinary } from "./store";

const docIdSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const EXT_RE = /\.(md|markdown|txt)$/i;

const addSchema = z.object({
    name: z.string().trim().min(1).max(L.nameMax).refine((n) => EXT_RE.test(n), { message: "Only .md and .txt files are supported." }),
    // Raw file text from the browser. Cleaned and re-measured on the server.
    text: z.string().max(L.maxCharsPerFile * 2),
    // Which persona uses it; empty = all personas.
    personaId: personaIdSchema.nullish(),
}).strict();

const updateSchema = z.object({
    docId: docIdSchema,
    enabled: z.boolean().optional(),
    personaId: personaIdSchema.nullish(),
}).strict().refine((v) => v.enabled !== undefined || v.personaId !== undefined, { message: "Nothing to change." });

const deleteSchema = z.object({ docId: docIdSchema }).strict();

async function assertPersona(workspaceId: string, personaId?: string | null) {
    if (!personaId) return;
    const snap = await personasRef(workspaceId).doc(personaId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Persona not found.");
}

/** Add a company-context file (text read in the browser). Limits: files per workspace, size per file and in total. */
export const addContextDoc = onCall(async (request) => {
    const uid = requireUid(request);
    const input = parse(addSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    await assertPersona(workspaceId, input.personaId);

    if (looksBinary(input.text)) throw new HttpsError("invalid-argument", "This doesn't look like a text file.");
    const text = cleanContextText(input.text);
    if (text.length < L.minCharsPerFile) throw new HttpsError("invalid-argument", "The file is empty or too short to be useful.");
    if (text.length > L.maxCharsPerFile) {
        throw new HttpsError("invalid-argument", `Files can be up to ${L.maxCharsPerFile.toLocaleString("en-US")} characters. Split larger documents.`);
    }

    const metaCol = contextDocsRef(workspaceId);
    const ref = metaCol.doc();
    await getFirestore().runTransaction(async (tx) => {
        const existing = await tx.get(metaCol);
        if (existing.size >= L.maxFiles) throw new HttpsError("resource-exhausted", `You can keep up to ${L.maxFiles} context files. Delete one first.`);
        const total = existing.docs.reduce((sum, d) => sum + Number(d.data().size ?? 0), 0);
        if (total + text.length > L.maxTotalChars) {
            throw new HttpsError("resource-exhausted", `Context files can hold ${L.maxTotalChars.toLocaleString("en-US")} characters in total. Delete a file or shorten this one.`);
        }
        tx.set(ref, {
            id: ref.id,
            name: input.name,
            kind: /\.txt$/i.test(input.name) ? "txt" : "md",
            size: text.length,
            preview: text.replace(/\s+/g, " ").slice(0, 200),
            personaId: input.personaId || null,
            enabled: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(contextTextsRef(workspaceId).doc(ref.id), { text });
    });

    await writeAudit(workspaceId, uid, "context.add", ref.id, { name: input.name, size: text.length });
    return { id: ref.id, size: text.length };
});

/** Turn a file on/off or change which persona it applies to. */
export const updateContextDoc = onCall(async (request) => {
    const uid = requireUid(request);
    const { docId, enabled, personaId } = parse(updateSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    await assertPersona(workspaceId, personaId);

    const ref = contextDocsRef(workspaceId).doc(docId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "File not found.");
        tx.update(ref, {
            ...(enabled !== undefined ? { enabled } : {}),
            ...(personaId !== undefined ? { personaId: personaId || null } : {}),
            updatedAt: FieldValue.serverTimestamp(),
        });
    });
    await writeAudit(workspaceId, uid, "context.update", docId, {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(personaId !== undefined ? { personaId: personaId || null } : {}),
    });
    return { id: docId };
});

export const deleteContextDoc = onCall(async (request) => {
    const uid = requireUid(request);
    const { docId } = parse(deleteSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);

    const metaRef = contextDocsRef(workspaceId).doc(docId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(metaRef);
        if (!snap.exists) throw new HttpsError("not-found", "File not found.");
        tx.delete(metaRef);
        tx.delete(contextTextsRef(workspaceId).doc(docId));
    });
    await writeAudit(workspaceId, uid, "context.delete", docId);
    return { id: docId, deleted: true };
});
