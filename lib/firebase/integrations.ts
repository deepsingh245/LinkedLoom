import { auth } from "../firebase";

const LINKEDIN_STATE_KEY = "linkedloom_linkedin_state";

/**
 * Start LinkedIn OAuth. When the user is logged in, their ID token is sent so the server attaches LinkedIn
 * to THIS account ("connect"); logged out it is a "login". The state is also kept in this browser so the
 * callback can reject a response that this browser didn't start.
 */
export const getLinkedInAuthUrl = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const idToken = await auth.currentUser?.getIdToken();
    const response = await fetch(`${baseUrl}/getLinkedInAuthUrl`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to get LinkedIn authorization URL");
    }
    const data = (await response.json()) as { url: string; state: string; mode?: "connect" | "login" };
    try {
        sessionStorage.setItem(LINKEDIN_STATE_KEY, data.state);
    } catch {
        // Private mode: the server-side one-time state still protects the exchange.
    }
    return data;
};

/** True if `state` is the one this browser started with (or the browser can't remember it). */
export const isOwnLinkedInState = (state: string) => {
    try {
        const saved = sessionStorage.getItem(LINKEDIN_STATE_KEY);
        sessionStorage.removeItem(LINKEDIN_STATE_KEY);
        return !saved || saved === state;
    } catch {
        return true;
    }
};

export const exchangeLinkedInToken = async (code: string, state: string, redirectUri?: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${baseUrl}/exchangeLinkedInToken`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.message || "Failed to exchange LinkedIn token");
    }

    return await response.json() as { success: boolean; mode: "connect" | "login"; customToken?: string };
};

export const getRedditAuthUrl = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${baseUrl}/getRedditAuthUrl`);
    if (!response.ok) {
        throw new Error("Failed to get Reddit authorization URL");
    }
    return await response.json() as { url: string; state: string };
};

export const exchangeRedditToken = async (
    code: string,
    state: string,
    redirectUri: string,
    idToken: string
) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${baseUrl}/exchangeRedditToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state, redirectUri, idToken }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to exchange Reddit token");
    }

    return await response.json() as { success: boolean };
};

/**
 * Disconnect Reddit via the backend: revokes tokens at Reddit and deletes
 * stored credentials and Reddit-derived data (client can't touch connections).
 */
export const disconnectReddit = async (_uid?: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be logged in to disconnect Reddit.");

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${baseUrl}/disconnectReddit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to disconnect Reddit");
    }
};