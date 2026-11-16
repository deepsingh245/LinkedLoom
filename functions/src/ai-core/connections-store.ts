import { HttpsError } from "firebase-functions/v2/https";
import { workspaceRef } from "../autopilot/workspace";
import { getSecretStore } from "./secret-store";
import type { ProviderId } from "./types";

// Client-readable metadata (no key material).
export const connectionsRef = (workspaceId: string) => workspaceRef(workspaceId).collection("aiConnections");
// Server-only: where the Secret Manager reference lives. Denied to clients by rules.
export const connectionSecretsRef = (workspaceId: string) => workspaceRef(workspaceId).collection("aiConnectionSecrets");

export type ConnectionStatus = "active" | "invalid" | "revoked";

export interface AIConnectionDoc {
    id: string;
    provider: ProviderId;
    label: string;
    keyHint: string;
    billingMode: "byok";
    status: ConnectionStatus;
    lastValidatedAt?: FirebaseFirestore.Timestamp;
    lastError?: string;
}

/** Throws unless the connection exists in this workspace and is active. */
export async function assertConnectionUsable(workspaceId: string, connectionId: string): Promise<AIConnectionDoc> {
    const snap = await connectionsRef(workspaceId).doc(connectionId).get();
    if (!snap.exists) throw new HttpsError("failed-precondition", "That AI connection doesn't exist.");
    const connection = snap.data() as AIConnectionDoc;
    if (connection.status !== "active") {
        throw new HttpsError("failed-precondition", `That AI connection is ${connection.status}. Test or replace it first.`);
    }
    return connection;
}

/** Resolve provider + plaintext key for a BYOK connection. The key must never leave the server. */
export async function resolveConnectionKey(workspaceId: string, connectionId: string): Promise<{ provider: ProviderId; apiKey: string }> {
    const connection = await assertConnectionUsable(workspaceId, connectionId);
    const secretSnap = await connectionSecretsRef(workspaceId).doc(connectionId).get();
    const secretRef = secretSnap.data()?.secretRef as string | undefined;
    if (!secretRef) throw new HttpsError("failed-precondition", "That AI connection has no stored key. Add it again.");
    const apiKey = await getSecretStore().access(secretRef);
    return { provider: connection.provider, apiKey };
}
