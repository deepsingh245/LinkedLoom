import { auth } from "../firebase";

export const getLinkedInAuthUrl = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${baseUrl}/getLinkedInAuthUrl`);
    if (!response.ok) {
        throw new Error("Failed to get LinkedIn authorization URL");
    }
    return await response.json() as { url: string; state: string };
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
        throw new Error(errData.error?.message || "Failed to exchange LinkedIn token");
    }

    return await response.json() as { success: boolean; customToken?: string };
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