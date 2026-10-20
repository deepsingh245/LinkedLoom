import { HttpsError } from "firebase-functions/v2/https";
import type { Request } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/** An error with an HTTP status for the plain `onRequest` endpoints (LinkedIn, Reddit). */
export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

/** Verify the Firebase ID token sent as `Authorization: Bearer <token>` (or body.idToken). Returns the uid. */
export async function authenticate(req: Request): Promise<string> {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : req.body?.idToken;
    if (!token) throw new ApiError(401, "Firebase ID token is required.");
    try {
        return (await admin.auth().verifyIdToken(token)).uid;
    } catch {
        throw new ApiError(401, "Invalid or expired ID token.");
    }
}

/** JSON error response: `{ success: false, message, error: { message } }`. */
export function sendError(res: any, error: any, fallback: string) {
    const status = error instanceof ApiError ? error.status : error instanceof HttpsError ? 400 : 500;
    console.error(fallback, error.response?.data || error.message);
    // Never echo internal error details for unexpected failures.
    const message = status >= 500 ? fallback : error.message || fallback;
    res.status(status).json({ success: false, message, error: { message } });
}
