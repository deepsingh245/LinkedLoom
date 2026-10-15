import { FieldValue, getFirestore, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { personasRef } from "../workspace";
import { nextRunAfter } from "./next-run";

/**
 * Server-only schedule index: researchSchedule/{workspaceId}__{personaId} = { nextRunAt }.
 * The dispatcher queries only this collection (single-field index on nextRunAt), so finding due
 * work never scans workspaces. It is a derived cache: personas are the source of truth and
 * `reconcileSchedule` repairs any drift.
 */
export const scheduleCol = () => getFirestore().collection("researchSchedule");
export const scheduleId = (workspaceId: string, personaId: string) => `${workspaceId}__${personaId}`;

/** A persona gets automatic runs when it is active, opted in, has something to read, and has posting windows. */
export function isSchedulable(persona: DocumentData | null | undefined): boolean {
    if (!persona || persona.status !== "active") return false;
    const research = persona.research ?? {};
    if (research.autoRun !== true) return false;
    if (!(research.feedUrls?.length > 0) && !research.webSearch) return false;
    return Array.isArray(persona.publishing?.postingWindows) && persona.publishing.postingWindows.length > 0;
}

export function nextRunFor(persona: DocumentData, from: Date): Date | null {
    return nextRunAfter(
        { timezone: persona.publishing.timezone, postsPerDay: persona.publishing.postsPerDay, postingWindows: persona.publishing.postingWindows },
        from
    );
}

/**
 * Bring the schedule index (and the persona's own `nextRunAt`, which the UI reads) in line with a persona.
 * Pass `persona = null` after deleting one.
 */
export async function syncSchedule(workspaceId: string, personaId: string, persona: DocumentData | null, now = new Date()): Promise<void> {
    const ref = scheduleCol().doc(scheduleId(workspaceId, personaId));
    const personaRef = personasRef(workspaceId).doc(personaId);
    const next = persona && isSchedulable(persona) ? nextRunFor(persona, now) : null;

    if (!persona || !next) {
        await ref.delete();
        if (persona) await personaRef.update({ nextRunAt: FieldValue.delete() }).catch(() => undefined);
        return;
    }
    await ref.set({
        workspaceId,
        personaId,
        personaVersion: persona.version,
        nextRunAt: Timestamp.fromDate(next),
        updatedAt: FieldValue.serverTimestamp(),
    });
    await personaRef.update({ nextRunAt: Timestamp.fromDate(next) }).catch(() => undefined);
}

/** Re-read a persona and sync it. Never throws: scheduling problems must not break persona edits. */
export async function syncScheduleFor(workspaceId: string, personaId: string): Promise<void> {
    try {
        const snap = await personasRef(workspaceId).doc(personaId).get();
        await syncSchedule(workspaceId, personaId, snap.exists ? snap.data()! : null);
    } catch (error) {
        logger.error("Schedule sync failed", { workspaceId, personaId, error: error instanceof Error ? error.message : String(error) });
    }
}

export interface ReconcileSummary {
    checked: number;
    created: number;
    removed: number;
}

/**
 * Repair the index from the personas: add missing entries, drop entries for personas that are no
 * longer schedulable. Run daily; also callable by admins.
 */
export async function reconcileSchedule(now = new Date()): Promise<ReconcileSummary> {
    const summary: ReconcileSummary = { checked: 0, created: 0, removed: 0 };
    const db = getFirestore();

    const personas = await db.collectionGroup("personas").where("research.autoRun", "==", true).get();
    const seen = new Set<string>();
    for (const doc of personas.docs) {
        const workspaceId = doc.ref.parent.parent?.id;
        if (!workspaceId) continue;
        summary.checked++;
        const persona = doc.data();
        const id = scheduleId(workspaceId, doc.id);
        if (isSchedulable(persona)) {
            seen.add(id);
            const existing = await scheduleCol().doc(id).get();
            if (!existing.exists || existing.data()?.personaVersion !== persona.version) {
                await syncSchedule(workspaceId, doc.id, persona, now);
                summary.created++;
            }
        }
    }

    // Entries whose persona is gone, paused, archived or switched off.
    const entries = await scheduleCol().limit(500).get();
    for (const entry of entries.docs) {
        if (seen.has(entry.id)) continue;
        const { workspaceId, personaId } = entry.data() as { workspaceId: string; personaId: string };
        const persona = await personasRef(workspaceId).doc(personaId).get();
        if (!isSchedulable(persona.exists ? persona.data() : null)) {
            await syncSchedule(workspaceId, personaId, persona.exists ? persona.data()! : null, now);
            summary.removed++;
        }
    }
    return summary;
}
