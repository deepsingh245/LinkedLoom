import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { PERSONA_LIMITS } from "./limits";
import {
    deletePersonaSchema,
    personaInputSchema,
    setAutopilotEnabledSchema,
    setPersonaStatusSchema,
    updatePersonaSchema,
} from "./schema";
import { ensureWorkspace, personasRef, settingsRef, writeAudit } from "./workspace";
import { parse, requireUid } from "../shared/callable";
import { assertConnectionUsable } from "../ai-core/connections-store";

/**
 * Create a persona in the caller's personal workspace (workspaces/{uid}).
 * The workspace is always derived from the auth token, never from client input.
 */
export const createPersona = onCall(async (request) => {
    const uid = requireUid(request);
    const input = parse(personaInputSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    if (input.ai.connectionId) await assertConnectionUsable(workspaceId, input.ai.connectionId);
    const collection = personasRef(workspaceId);
    const ref = collection.doc();

    await getFirestore().runTransaction(async (tx) => {
        const active = await tx.get(collection.where("status", "in", ["active", "paused"]));
        if (active.size >= PERSONA_LIMITS.personasPerWorkspace) {
            throw new HttpsError(
                "resource-exhausted",
                `You can have up to ${PERSONA_LIMITS.personasPerWorkspace} personas. Archive one first.`
            );
        }
        const now = FieldValue.serverTimestamp();
        tx.set(ref, {
            ...input,
            research: { ...input.research, sourceIds: [] },
            id: ref.id,
            workspaceId,
            status: "active",
            version: 1,
            createdBy: uid,
            createdAt: now,
            updatedAt: now,
        });
    });

    await writeAudit(workspaceId, uid, "persona.create", ref.id, { name: input.name });
    return { id: ref.id, version: 1 };
});

/**
 * Replace a persona's configuration. Rejects stale edits via expectedVersion.
 */
export const updatePersona = onCall(async (request) => {
    const uid = requireUid(request);
    const { personaId, expectedVersion, persona } = parse(updatePersonaSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    if (persona.ai.connectionId) await assertConnectionUsable(workspaceId, persona.ai.connectionId);
    const ref = personasRef(workspaceId).doc(personaId);

    const version = await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "Persona not found.");
        const current = snap.data()!;
        if (current.status === "archived") {
            throw new HttpsError("failed-precondition", "Archived personas can't be edited. Restore it first.");
        }
        if (current.version !== expectedVersion) {
            throw new HttpsError("aborted", "This persona was changed elsewhere. Reload and try again.");
        }
        const next = current.version + 1;
        tx.update(ref, {
            ...persona,
            research: { ...persona.research, sourceIds: current.research?.sourceIds ?? [] },
            // Optional fields removed by the user must be cleared, not kept.
            description: persona.description ?? FieldValue.delete(),
            version: next,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return next;
    });

    await writeAudit(workspaceId, uid, "persona.update", personaId, { version });
    return { id: personaId, version };
});

/**
 * Pause, resume (active) or archive a persona.
 */
export const setPersonaStatus = onCall(async (request) => {
    const uid = requireUid(request);
    const { personaId, status } = parse(setPersonaStatusSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const collection = personasRef(workspaceId);
    const ref = collection.doc(personaId);

    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "Persona not found.");
        const current = snap.data()!;
        if (current.status === status) return;

        // Restoring an archived persona counts against the limit again.
        if (current.status === "archived") {
            const active = await tx.get(collection.where("status", "in", ["active", "paused"]));
            if (active.size >= PERSONA_LIMITS.personasPerWorkspace) {
                throw new HttpsError(
                    "resource-exhausted",
                    `You can have up to ${PERSONA_LIMITS.personasPerWorkspace} personas. Archive one first.`
                );
            }
        }
        tx.update(ref, { status, updatedAt: FieldValue.serverTimestamp() });
    });

    await writeAudit(workspaceId, uid, "persona.status", personaId, { status });
    return { id: personaId, status };
});

/**
 * Permanently delete a persona. Only archived personas can be deleted.
 */
export const deletePersona = onCall(async (request) => {
    const uid = requireUid(request);
    const { personaId } = parse(deletePersonaSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = personasRef(workspaceId).doc(personaId);

    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "Persona not found.");
        if (snap.data()!.status !== "archived") {
            throw new HttpsError("failed-precondition", "Archive the persona before deleting it.");
        }
        tx.delete(ref);
    });

    await writeAudit(workspaceId, uid, "persona.delete", personaId);
    return { id: personaId, deleted: true };
});

/**
 * Global kill switch for all Autopilot activity in the workspace.
 */
export const setAutopilotEnabled = onCall(async (request) => {
    const uid = requireUid(request);
    const { enabled } = parse(setAutopilotEnabledSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);

    await settingsRef(workspaceId).set(
        { autopilotEnabled: enabled, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
    );

    await writeAudit(workspaceId, uid, "autopilot.toggle", undefined, { enabled });
    return { autopilotEnabled: enabled };
});
