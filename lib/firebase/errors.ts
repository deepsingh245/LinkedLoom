import { FirebaseError } from "firebase/app";

// Callable error codes whose messages are written for users (limits, timeouts, bad keys).
const USER_FACING_CODES = new Set([
  "functions/resource-exhausted",
  "functions/deadline-exceeded",
  "functions/failed-precondition",
  "functions/invalid-argument",
  "functions/not-found",
]);

/** Prefer the backend's readable message for user-facing callable errors, else the fallback. */
export function callableErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError && USER_FACING_CODES.has(error.code) && error.message) {
    return error.message;
  }
  return fallback;
}
