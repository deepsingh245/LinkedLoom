import { HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { ZodError, ZodType } from "zod";

export function requireUid(request: CallableRequest): string {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    return request.auth.uid;
}

/** Parse callable input with zod; turn validation failures into a readable invalid-argument error. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            const issue = error.issues[0];
            const field = issue?.path?.join(".");
            throw new HttpsError("invalid-argument", field ? `${field}: ${issue.message}` : issue?.message || "Invalid input.");
        }
        throw error;
    }
}
