import { HttpsError } from "firebase-functions/v2/https";

/** Stop the run politely (credits, limits, time budget). Not a failure: what exists so far is kept. */
export class StopRun extends Error {}

/** The user (or the system) asked the run to stop: kill switch, pause, cancel. */
export class CancelRun extends Error {}

export type ErrorAction = "stop" | "retry" | "fail";

/**
 * How a workflow step should react to an error:
 * - stop:  out of credits / a configured limit → finish as "partial" with what we have
 * - retry: transient (provider timeout / rate limit / 5xx, network, Firestore hiccup) → let Cloud Tasks retry the step
 * - fail:  retrying can't help (bad configuration, rejected key, missing data) → fail the run now
 */
export function classifyError(error: unknown): ErrorAction {
    if (error instanceof StopRun) return "stop";
    if (error instanceof HttpsError) {
        const kind = (error.details as { kind?: string } | undefined)?.kind;
        switch (error.code) {
        case "resource-exhausted":
            return kind === "provider_rate_limit" ? "retry" : "stop";
        case "deadline-exceeded":
        case "unavailable":
        case "aborted":
            return "retry";
        case "internal":
            return kind === "provider_unavailable" || kind === "bad_output" ? "retry" : "fail";
        default:
            return "fail"; // failed-precondition, invalid-argument, not-found, permission-denied, ...
        }
    }
    // Plain errors (network, Firestore, unexpected): assume transient; the attempt limit bounds the cost.
    return "retry";
}
