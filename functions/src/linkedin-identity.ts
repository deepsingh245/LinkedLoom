/**
 * Which LinkedLoom account does a LinkedIn sign-in belong to? Pure decision logic (no I/O) so every
 * case can be unit-tested; `exchangeLinkedInToken` gathers the facts and carries out the decision.
 *
 * Rules:
 *  - Connect (user was logged in when they started): always attach LinkedIn to THAT account. Never create
 *    or switch accounts. Refuse only if this LinkedIn identity already belongs to a different account.
 *  - Login (not logged in): 1) the LinkedIn identity is already linked → that account;
 *    2) else a verified LinkedIn email that matches an existing, email-verified account → that account;
 *    3) else a verified email with no account → create one. Unverified emails are never trusted.
 *  - An existing account whose own email isn't verified is NOT signed into by email match (someone could
 *    have pre-registered the address with a password they know). That user connects LinkedIn from Settings.
 */
export type LinkedInMode = "connect" | "login";

export interface LinkedInFacts {
    mode: LinkedInMode;
    /** The uid stored with the OAuth state when the user was logged in (connect mode). */
    stateUid?: string;
    /** The account this LinkedIn identity (`sub`) is already linked to, if any. */
    identityUid?: string;
    /** LinkedIn's email and whether LinkedIn says it is verified. */
    email?: string;
    emailVerified: boolean;
    /** The existing account with that email, if any. */
    emailUser?: { uid: string; emailVerified: boolean; linkedinSub?: string };
}

export type LinkedInDecision =
    | { action: "connect"; uid: string }
    | { action: "login"; uid: string; via: "identity" | "email" }
    | { action: "create" }
    | { action: "reject"; status: number; message: string };

const reject = (status: number, message: string): LinkedInDecision => ({ action: "reject", status, message });

export function decideLinkedInAccount(f: LinkedInFacts): LinkedInDecision {
    if (f.mode === "connect") {
        if (!f.stateUid) return reject(400, "This LinkedIn connection request is missing its account. Start again from Settings.");
        if (f.identityUid && f.identityUid !== f.stateUid) {
            return reject(409, "This LinkedIn account is already connected to a different LinkedLoom account. Sign in to that account, or use another LinkedIn account.");
        }
        return { action: "connect", uid: f.stateUid };
    }

    if (f.identityUid) return { action: "login", uid: f.identityUid, via: "identity" };

    if (!f.email) return reject(400, "Your LinkedIn profile has no email address, so we can't match it to an account.");
    if (!f.emailVerified) return reject(400, "LinkedIn hasn't verified your email address. Verify it on LinkedIn and try again, or sign in another way and connect LinkedIn from Settings.");

    if (f.emailUser) {
        if (!f.emailUser.emailVerified) {
            return reject(409, "An account with this email exists but its email isn't verified yet. Sign in with your password or Google, then connect LinkedIn from Settings → Connections.");
        }
        if (f.emailUser.linkedinSub) {
            return reject(409, "That account is connected to a different LinkedIn profile. Sign in another way, then reconnect LinkedIn from Settings → Connections.");
        }
        return { action: "login", uid: f.emailUser.uid, via: "email" };
    }
    return { action: "create" };
}

/** Fields to write on `users/{uid}`: LinkedIn never overwrites a name/photo/email the user already has. */
export function profileFieldsForLinkedIn(
    existing: { displayName?: string; photoURL?: string; email?: string } | undefined,
    linkedin: { name?: string; picture?: string; email?: string }
): Record<string, string> {
    const out: Record<string, string> = {};
    if (linkedin.name) out.linkedin = linkedin.name; // the "connected" label shown in Settings
    if (!existing?.displayName && linkedin.name) out.displayName = linkedin.name;
    if (!existing?.photoURL && linkedin.picture) out.photoURL = linkedin.picture;
    if (!existing?.email && linkedin.email) out.email = linkedin.email;
    return out;
}
