import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { FirebaseFunctions } from "./functions";

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
