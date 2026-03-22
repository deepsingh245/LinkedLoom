import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { FirebaseFunctions } from "./functions";

export const getLinkedInAuthUrl = async () => {
    const getUrl = httpsCallable(functions, FirebaseFunctions.GET_LINKEDIN_AUTH_URL);
    const result = await getUrl();
    return result.data as { url: string, state: string };
};

export const exchangeLinkedInToken = async (code: string, redirectUri?: string) => {
    const exchange = httpsCallable(functions, FirebaseFunctions.EXCHANGE_LINKEDIN_TOKEN);
    const result = await exchange({ code, redirect_uri: redirectUri });
    return result.data as { success: boolean };
};
