import { Timestamp } from "firebase-admin/firestore";
import { workspaceRef } from "../workspace";

/**
 * Short-lived step outputs for one research run: `workflowRuns/{runId}/artifacts/{name}`.
 * Server-only (denied to clients by rules). They let a later step, or a retry, continue without
 * re-fetching pages or repeating paid AI calls. They hold article text temporarily, so every
 * artifact expires after 24 h (set a Firestore TTL policy on `expireAt`) and is deleted when the run ends.
 */
const ARTIFACT_TTL_MS = 24 * 60 * 60 * 1000;

const col = (workspaceId: string, runId: string) => workspaceRef(workspaceId).collection("workflowRuns").doc(runId).collection("artifacts");

/** Stored as a JSON string so values like undefined/Dates/nested arrays can't trip Firestore's rules. */
export async function writeArtifact(workspaceId: string, runId: string, name: string, data: unknown): Promise<void> {
    const json = JSON.stringify(data);
    if (json.length > 900_000) throw new Error(`Artifact ${name} is too large.`);
    await col(workspaceId, runId).doc(name).set({ json, expireAt: Timestamp.fromMillis(Date.now() + ARTIFACT_TTL_MS) });
}

export async function readArtifact<T>(workspaceId: string, runId: string, name: string): Promise<T | null> {
    const snap = await col(workspaceId, runId).doc(name).get();
    const json = snap.data()?.json as string | undefined;
    return json ? (JSON.parse(json) as T) : null;
}

export async function deleteArtifacts(workspaceId: string, runId: string): Promise<void> {
    const snap = await col(workspaceId, runId).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
}
