import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { releaseReservation } from "./credits";

/**
 * Release credit reservations that were never settled (e.g. a function crashed mid-call),
 * so held credits don't stay locked forever.
 */
export async function releaseExpiredReservations(limit = 200): Promise<number> {
    const expired = await getFirestore()
        .collectionGroup("creditReservations")
        .where("status", "==", "held")
        .where("expiresAt", "<=", Timestamp.now())
        .limit(limit)
        .get();

    let released = 0;
    for (const doc of expired.docs) {
        const workspaceId = doc.ref.parent.parent?.id;
        if (!workspaceId) continue;
        await releaseReservation(workspaceId, doc.id, "expired");
        released++;
    }
    return released;
}

export const sweepCreditReservations = onSchedule("every 15 minutes", async () => {
    const released = await releaseExpiredReservations();
    if (released) logger.info(`Released ${released} expired credit reservations.`);
});
