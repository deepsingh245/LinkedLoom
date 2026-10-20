import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { PERSONA_LIMITS } from "./limits";
import {
    deletePersonaSchema,
    personaInputSchema,
    setAutopilotEnabledSchema,
    setPersonaApprovalModeSchema,
    setPersonaStatusSchema,
    updatePersonaSchema,
} from "./schema";
import { ensureWorkspace, personasRef, settingsRef, writeAudit } from "./workspace";
import { parse, requireUid } from "../shared/callable";
import { assertConnectionUsable } from "../ai-core/connections-store";
import { syncScheduleFor } from "./scheduling/schedule-index";
import { linkedinStatus } from "./approval/approve";

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
            // New personas always start with manual approval; auto-publish is a separate, confirmed opt-in.
            publishing: { ...input.publishing, approvalMode: "manual" },
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
    await syncScheduleFor(workspaceId, ref.id);
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
            // Editing never changes the approval mode (see setPersonaApprovalMode).
            publishing: { ...persona.publishing, approvalMode: current.publishing?.approvalMode === "automatic" ? "automatic" : "manual" },
            // Optional fields removed by the user must be cleared, not kept.
            description: persona.description ?? FieldValue.delete(),
            version: next,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return next;
    });

    await writeAudit(workspaceId, uid, "persona.update", personaId, { version });
    await syncScheduleFor(workspaceId, personaId);
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
    await syncScheduleFor(workspaceId, personaId);
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
    await syncScheduleFor(workspaceId, personaId); // persona is gone → removes its schedule entry
    return { id: personaId, deleted: true };
});

/**
 * Turn opt-in auto-publish on or off for one persona. "automatic" means drafts that pass verification
 * with a high enough quality score are scheduled into the next free slot without review.
 * Needs explicit confirmation, Autopilot on, and a working LinkedIn connection. The kill switch still
 * stops everything; turning it back to "manual" never touches posts that are already scheduled.
 */
export const setPersonaApprovalMode = onCall(async (request) => {
    const uid = requireUid(request);
    const { personaId, mode } = parse(setPersonaApprovalModeSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = personasRef(workspaceId).doc(personaId);

    if (mode === "automatic") {
        const [settings, linkedin] = await Promise.all([settingsRef(workspaceId).get(), linkedinStatus(uid)]);
        if (settings.data()?.autopilotEnabled === false) throw new HttpsError("failed-precondition", "Autopilot is stopped. Turn it on first.");
        if (!linkedin.connected || linkedin.expired) throw new HttpsError("failed-precondition", "Connect LinkedIn in Settings before turning on auto-publish.");
    }

    const version = await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "Persona not found.");
        const current = snap.data()!;
        if (current.status === "archived") throw new HttpsError("failed-precondition", "Restore the persona first.");
        if ((current.publishing?.approvalMode ?? "manual") === mode) return current.version as number;
        const next = (current.version as number) + 1;
        tx.update(ref, { "publishing.approvalMode": mode, version: next, updatedAt: FieldValue.serverTimestamp() });
        return next;
    });

    await writeAudit(workspaceId, uid, "persona.approvalMode", personaId, { mode });
    return { id: personaId, approvalMode: mode, version };
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
