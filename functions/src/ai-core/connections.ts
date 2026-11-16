import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { ensureWorkspace, personasRef, writeAudit } from "../autopilot/workspace";
import { parse, requireUid } from "../shared/callable";
import { connectionSecretsRef, connectionsRef } from "./connections-store";
import { getProvider } from "./providers";
import { errorMessage, keyHint } from "./redact";
import { getSecretStore } from "./secret-store";
import { PROVIDERS, ProviderError } from "./types";

const MAX_CONNECTIONS = 5;
const VALIDATE_TIMEOUT_MS = 15_000;

const addSchema = z.object({
    provider: z.enum(PROVIDERS),
    label: z.string().trim().min(1, { message: "Label is required." }).max(40),
    apiKey: z.string().trim().min(10, { message: "That doesn't look like an API key." }).max(300),
}).strict();

const idSchema = z.object({ connectionId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) }).strict();

function validationMessage(error: unknown, apiKey: string): string {
    if (error instanceof ProviderError) {
        if (error.kind === "auth") return "The provider rejected this API key.";
        if (error.kind === "rate_limit") return "The provider rate-limited the check. Try again in a minute.";
        if (error.kind === "ambiguous") return "Couldn't reach the provider to check the key. Try again.";
    }
    return `Couldn't verify the key: ${errorMessage(error, [apiKey])}`;
}

/**
 * Store a user's own AI provider key (BYOK). The key is validated, written to Secret Manager,
 * and never returned or logged. Firestore keeps only metadata + a reference.
 */
export const addAIConnection = onCall(async (request) => {
    const uid = requireUid(request);
    const { provider, label, apiKey } = parse(addSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);

    const active = await connectionsRef(workspaceId).where("status", "in", ["active", "invalid"]).get();
    if (active.size >= MAX_CONNECTIONS) {
        throw new HttpsError("resource-exhausted", `You can have up to ${MAX_CONNECTIONS} AI connections. Revoke one first.`);
    }

    try {
        await getProvider(provider).validateKey(apiKey, VALIDATE_TIMEOUT_MS);
    } catch (error) {
        throw new HttpsError("invalid-argument", validationMessage(error, apiKey));
    }

    const ref = connectionsRef(workspaceId).doc();
    const secretRef = await getSecretStore().create(`byok-${workspaceId}-${ref.id}`, apiKey);
    const now = FieldValue.serverTimestamp();
    const batch = getFirestore().batch();
    batch.set(ref, {
        id: ref.id,
        provider,
        label,
        keyHint: keyHint(apiKey),
        billingMode: "byok",
        status: "active",
        lastValidatedAt: now,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
    });
    batch.set(connectionSecretsRef(workspaceId).doc(ref.id), { secretRef, createdAt: now });
    await batch.commit();

    await writeAudit(workspaceId, uid, "ai.connection.add", ref.id, { provider });
    return { id: ref.id, provider, label, keyHint: keyHint(apiKey), status: "active" };
});

/** Re-check a stored key and update its status. */
export const testAIConnection = onCall(async (request) => {
    const uid = requireUid(request);
    const { connectionId } = parse(idSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = connectionsRef(workspaceId).doc(connectionId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.status === "revoked") throw new HttpsError("not-found", "AI connection not found.");

    const secretRef = (await connectionSecretsRef(workspaceId).doc(connectionId).get()).data()?.secretRef as string | undefined;
    if (!secretRef) throw new HttpsError("failed-precondition", "No key stored for this connection. Add it again.");
    const apiKey = await getSecretStore().access(secretRef);

    let ok = true;
    let message = "";
    try {
        await getProvider(snap.data()!.provider).validateKey(apiKey, VALIDATE_TIMEOUT_MS);
    } catch (error) {
        // Only a rejected key marks the connection invalid; transient failures leave it as is.
        ok = !(error instanceof ProviderError && error.kind === "auth");
        message = validationMessage(error, apiKey);
        if (ok) throw new HttpsError("unavailable", message);
    }

    await ref.update({
        status: ok ? "active" : "invalid",
        lastValidatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastError: ok ? FieldValue.delete() : message,
    });
    await writeAudit(workspaceId, uid, "ai.connection.test", connectionId, { ok });
    return { id: connectionId, status: ok ? "active" : "invalid", message: ok ? "Key works." : message };
});

/** Delete the stored key and detach the connection from any persona using it. */
export const revokeAIConnection = onCall(async (request) => {
    const uid = requireUid(request);
    const { connectionId } = parse(idSchema, request.data);
    const workspaceId = await ensureWorkspace(uid);
    const ref = connectionsRef(workspaceId).doc(connectionId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "AI connection not found.");

    const secretDoc = connectionSecretsRef(workspaceId).doc(connectionId);
    const secretRef = (await secretDoc.get()).data()?.secretRef as string | undefined;
    if (secretRef) await getSecretStore().destroy(secretRef);

    const usingPersonas = await personasRef(workspaceId).where("ai.connectionId", "==", connectionId).get();
    const batch = getFirestore().batch();
    batch.update(ref, { status: "revoked", updatedAt: FieldValue.serverTimestamp(), lastError: FieldValue.delete() });
    batch.delete(secretDoc);
    for (const persona of usingPersonas.docs) {
        // Fall back to managed credits; bump version so stale editors can't overwrite this.
        batch.update(persona.ref, {
            "ai.connectionId": FieldValue.delete(),
            "version": FieldValue.increment(1),
            "updatedAt": FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();

    await writeAudit(workspaceId, uid, "ai.connection.revoke", connectionId, { detachedPersonas: usingPersonas.size });
    return { id: connectionId, status: "revoked", detachedPersonas: usingPersonas.size };
});
