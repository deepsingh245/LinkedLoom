import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { writeAudit } from "../autopilot/workspace";
import { parse, requireUid } from "../shared/callable";
import { grantCredits } from "./credits";

const schema = z.object({
    workspaceId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
    amount: z.number().int().min(1).max(1_000_000),
    reason: z.string().trim().min(3).max(200),
    idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

/**
 * Manually add credits to a workspace (support, beta testers) until payments exist (A6).
 * Requires the `admin: true` custom claim (set with the Admin SDK, never from the client).
 */
export const adminGrantCredits = onCall(async (request) => {
    const uid = requireUid(request);
    if (request.auth?.token.admin !== true) throw new HttpsError("permission-denied", "Admins only.");
    const { workspaceId, amount, reason, idempotencyKey } = parse(schema, request.data);

    const result = await grantCredits(workspaceId, amount, `admin_${idempotencyKey}`, { reason, grantedBy: uid });
    if (result.applied) await writeAudit(workspaceId, uid, "credits.grant", undefined, { amount, reason });
    return result;
});
