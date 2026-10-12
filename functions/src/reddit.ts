import { onRequest, HttpsError } from "firebase-functions/v2/https";
import type { Request } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as crypto from "crypto";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const REDDIT_SCOPE = "identity submit read";

// Reddit requires a unique, descriptive User-Agent: <platform>:<app id>:<version> (by /u/<username>)
const USER_AGENT = process.env.REDDIT_USER_AGENT || "web:linkedloom:1.0 (by /u/linkedloom)";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
// Anti-spam guard (Reddit Responsible Builder / Public Content policies): cap posts per user.
const MAX_POSTS_PER_DAY = Number(process.env.REDDIT_MAX_POSTS_PER_DAY || 5);
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * axios wrapper that honours Reddit rate limits: retries on 429 using
 * Retry-After / X-Ratelimit-Reset and slows down when remaining quota is low.
 */
async function redditRequest<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await axios.request<T>({
                timeout: 10000,
                ...config,
                headers: { "User-Agent": USER_AGENT, ...(config.headers || {}) },
            });
            const remaining = Number(res.headers["x-ratelimit-remaining"]);
            const reset = Number(res.headers["x-ratelimit-reset"]);
            if (!Number.isNaN(remaining) && remaining < 2 && reset > 0) {
                await sleep(Math.min(reset, 10) * 1000);
            }
            return res;
        } catch (err: any) {
            const status = err.response?.status;
            if (status === 429 && attempt < MAX_RETRIES) {
                const wait = Number(err.response.headers["retry-after"] || err.response.headers["x-ratelimit-reset"] || 2);
                await sleep(Math.min(wait, 30) * 1000);
                continue;
            }
            throw err;
        }
    }
}

/** Verify the Firebase ID token sent as `Authorization: Bearer <token>` (or body.idToken). */
async function authenticate(req: Request): Promise<string> {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : req.body?.idToken;
    if (!token) throw new ApiError(401, "Firebase ID token is required.");
    try {
        return (await admin.auth().verifyIdToken(token)).uid;
    } catch {
        throw new ApiError(401, "Invalid or expired ID token.");
    }
}

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

function sendError(res: any, error: any, fallback: string) {
    const status = error instanceof ApiError ? error.status : error instanceof HttpsError ? 400 : 500;
    console.error(fallback, error.response?.data || error.message);
    res.status(status).json({ success: false, message: error.message || fallback, error: { message: error.message || fallback } });
}

const getRedditConfig = () => {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const redirectUri = process.env.REDDIT_REDIRECT_URI;

    if (!clientId) throw new HttpsError("failed-precondition", "REDDIT_CLIENT_ID is not configured.");
    if (!clientSecret) throw new HttpsError("failed-precondition", "REDDIT_CLIENT_SECRET is not configured.");
    if (!redirectUri) throw new HttpsError("failed-precondition", "REDDIT_REDIRECT_URI is not configured.");

    return { clientId, clientSecret, redirectUri };
};

/**
 * Generate Reddit OAuth authorization URL
 */
export const getRedditAuthUrl = onRequest({ cors: true }, async (req, res) => {
    try {
        const { clientId, redirectUri } = getRedditConfig();
        const state = crypto.randomUUID();

        await db.collection("oauthStates").doc(state).set({ createdAt: new Date().toISOString() });

        const authUrl =
            `https://www.reddit.com/api/v1/authorize` +
            `?client_id=${clientId}` +
            `&response_type=code` +
            `&state=${state}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&duration=permanent` +
            `&scope=${encodeURIComponent(REDDIT_SCOPE)}`;

        res.json({ url: authUrl, state });
    } catch (error: any) {
        sendError(res, error, "Failed to create Reddit authorization URL.");
    }
});

/**
 * Exchange Reddit OAuth code for tokens and store the connection under the authenticated user's UID.
 * The caller passes their Firebase ID token so the Reddit account is tied to their LinkedLoom account.
 */
export const exchangeRedditToken = onRequest({ cors: true }, async (req, res) => {
    try {
        const { code, state } = req.body;
        if (!code || !state) throw new ApiError(400, "Missing OAuth parameters.");
        const uid = await authenticate(req);

        // Validate and consume CSRF state (single use, short-lived)
        const stateDoc = await db.collection("oauthStates").doc(state).get();
        if (!stateDoc.exists) throw new ApiError(403, "Invalid OAuth state.");
        const createdAt = new Date(stateDoc.data()?.createdAt).getTime();
        await stateDoc.ref.delete();
        if (!createdAt || Date.now() - createdAt > OAUTH_STATE_TTL_MS) {
            throw new ApiError(403, "OAuth state expired. Please try connecting again.");
        }

        const { clientId, clientSecret, redirectUri } = getRedditConfig();
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", redirectUri);

        const tokenResponse = await redditRequest({
            method: "POST",
            url: "https://www.reddit.com/api/v1/access_token",
            data: params,
            headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        if (!access_token) throw new ApiError(502, "Failed to obtain Reddit access token.");

        const profileResponse = await redditRequest({
            method: "GET",
            url: "https://oauth.reddit.com/api/v1/me",
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const profileData = profileResponse.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        const userRef = db.collection("users").doc(uid);
        await userRef.set({ reddit: profileData.name, updatedAt: new Date() }, { merge: true });

        const connectionRef = userRef.collection("connections").doc("reddit");
        const existingConnection = await connectionRef.get();
        const connectionPayload: any = {
            provider: "reddit",
            providerUserId: profileData.id,
            accessToken: access_token,
            refreshToken: refresh_token || null,
            expiresAt,
            name: profileData.name,
            iconImg: profileData.icon_img || null,
            updatedAt: new Date(),
        };
        if (!existingConnection.exists) connectionPayload.createdAt = new Date();
        await connectionRef.set(connectionPayload, { merge: true });

        console.log(`Reddit connected for user ${uid}`);
        res.json({ success: true });
    } catch (error: any) {
        sendError(res, error, "Failed to link Reddit account.");
    }
});

/**
 * Returns a valid access token, refreshing and persisting it when expired.
 */
async function getValidAccessToken(uid: string, connection: any): Promise<string> {
    const expiresAt = connection.expiresAt?.toDate ? connection.expiresAt.toDate() : new Date(connection.expiresAt);
    // 60s safety margin
    if (connection.accessToken && expiresAt.getTime() - 60_000 > Date.now()) {
        return connection.accessToken;
    }
    if (!connection.refreshToken) {
        throw new Error("Reddit access token expired and no refresh token available. Please reconnect Reddit.");
    }

    const { clientId, clientSecret } = getRedditConfig();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", connection.refreshToken);

    const response = await redditRequest({
        method: "POST",
        url: "https://www.reddit.com/api/v1/access_token",
        data: params,
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, expires_in } = response.data;
    if (!access_token) throw new Error("Failed to refresh Reddit access token.");

    // Persist so later calls don't refresh again
    await db.collection("users").doc(uid).collection("connections").doc("reddit").set(
        { accessToken: access_token, expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000), updatedAt: new Date() },
        { merge: true }
    );
    return access_token;
}

/** Enforce a per-user daily posting cap (anti-spam) and return the log doc to record the post in. */
async function reserveDailyPostSlot(uid: string) {
    const log = db.collection("users").doc(uid).collection("redditPosts");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await log.where("createdAt", ">=", since).get();
    if (recent.size >= MAX_POSTS_PER_DAY) {
        throw new ApiError(429, `Daily Reddit posting limit reached (${MAX_POSTS_PER_DAY}/24h).`);
    }
    return log.doc();
}

/**
 * Internal helper used by the scheduler and the HTTP endpoint.
 * Handles token refresh, the daily cap, builds the submission payload, and posts it.
 */
export async function publishToRedditInternal(
    uid: string,
    connection: any,
    content: string,
    subreddit?: string,
    imageUrl?: string
) {
    const accessToken = await getValidAccessToken(uid, connection);
    const slot = await reserveDailyPostSlot(uid);

    // Default to the user's own profile page (r/u_username); strip any "r/" prefix
    const cleanSub = subreddit?.trim().replace(/^\/?r\//i, "");
    const targetSubreddit = cleanSub || `u_${connection.name}`;

    const lines = content.trim().split("\n");
    const title = lines[0].substring(0, 300);
    const body = lines.slice(1).join("\n").trim() || "";

    const params = new URLSearchParams();
    params.append("sr", targetSubreddit);
    params.append("title", title);
    params.append("nsfw", "false");
    params.append("spoiler", "false");
    params.append("api_type", "json");

    if (imageUrl && !imageUrl.startsWith("data:")) {
        params.append("kind", "link");
        params.append("url", imageUrl);
    } else {
        params.append("kind", "self");
        params.append("text", body);
    }

    const response = await redditRequest({
        method: "POST",
        url: "https://oauth.reddit.com/api/submit",
        data: params,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
    });

    const result = response.data?.json;
    if (result?.errors?.length > 0) {
        throw new Error(`Reddit submission error: ${JSON.stringify(result.errors)}`);
    }

    await slot.set({ createdAt: new Date(), subreddit: targetSubreddit, postId: result?.data?.id || null });
    return { postUrl: result?.data?.url as string | undefined, postId: result?.data?.id as string | undefined };
}

/**
 * Publish a post to Reddit (HTTP endpoint). The user is taken from the verified ID token.
 */
export const publishToReddit = onRequest({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const uid = await authenticate(req);
        const { content, subreddit, imageUrl } = req.body;
        if (!content) throw new ApiError(400, "Missing content.");

        const connectionDoc = await db.collection("users").doc(uid).collection("connections").doc("reddit").get();
        if (!connectionDoc.exists) throw new ApiError(412, "No Reddit connection found for this user.");

        const result = await publishToRedditInternal(uid, connectionDoc.data()!, content, subreddit, imageUrl);
        res.json({ success: true, data: result });
    } catch (error: any) {
        sendError(res, error, "Failed to publish to Reddit.");
    }
});

/**
 * Disconnect Reddit: revoke tokens at Reddit, delete stored credentials and Reddit-derived data.
 */
export const disconnectReddit = onRequest({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const uid = await authenticate(req);
        const userRef = db.collection("users").doc(uid);
        const connectionRef = userRef.collection("connections").doc("reddit");
        const connectionDoc = await connectionRef.get();

        if (connectionDoc.exists) {
            const connection = connectionDoc.data()!;
            try {
                const { clientId, clientSecret } = getRedditConfig();
                const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
                const tokens: [string | null, string][] = [
                    [connection.refreshToken, "refresh_token"],
                    [connection.accessToken, "access_token"],
                ];
                for (const [token, hint] of tokens) {
                    if (!token) continue;
                    const params = new URLSearchParams();
                    params.append("token", token);
                    params.append("token_type_hint", hint);
                    await redditRequest({
                        method: "POST",
                        url: "https://www.reddit.com/api/v1/revoke_token",
                        data: params,
                        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
                    });
                }
            } catch (e: any) {
                console.warn("Reddit token revoke failed (continuing):", e.message);
            }
            await connectionRef.delete();
        }

        const logs = await userRef.collection("redditPosts").get();
        await Promise.all(logs.docs.map((d: any) => d.ref.delete()));
        await userRef.set({ reddit: null, updatedAt: new Date() }, { merge: true });

        res.json({ success: true });
    } catch (error: any) {
        sendError(res, error, "Failed to disconnect Reddit.");
    }
});

/**
 * Fetch basic Reddit analytics for the authenticated user (own posts only).
 */
export const getRedditAnalytics = onRequest({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const uid = await authenticate(req);
        const connectionDoc = await db.collection("users").doc(uid).collection("connections").doc("reddit").get();
        if (!connectionDoc.exists) {
            res.json({ success: false, message: "No Reddit connection found.", data: null });
            return;
        }

        const connection = connectionDoc.data()!;
        let totalPosts = 0;
        let totalLikes = 0;
        let totalComments = 0;

        try {
            const accessToken = await getValidAccessToken(uid, connection);
            const postsResponse = await redditRequest({
                method: "GET",
                url: `https://oauth.reddit.com/user/${encodeURIComponent(connection.name)}/submitted?limit=25`,
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            // Only the user's own, non-deleted/non-removed posts
            const posts = (postsResponse.data?.data?.children || []).filter(
                (p: any) => !p.data.removed_by_category && p.data.author !== "[deleted]"
            );
            totalPosts = posts.length;
            totalLikes = posts.reduce((sum: number, p: any) => sum + (p.data.score || 0), 0);
            totalComments = posts.reduce((sum: number, p: any) => sum + (p.data.num_comments || 0), 0);
        } catch (apiError: any) {
            console.warn("Could not fetch Reddit posts, falling back to local DB:", apiError.message);
            const localPosts = await db.collection("posts")
                .where("user_id", "==", uid)
                .where("status", "==", "PUBLISHED")
                .get();
            totalPosts = localPosts.size;
        }

        const dashboardData = {
            totalPosts,
            totalLikes,
            totalComments,
            totalShares: 0,
            chartData: [
                { name: "Mon", posts: 0, engagement: 0 },
                { name: "Tue", posts: 0, engagement: 0 },
                { name: "Wed", posts: 0, engagement: 0 },
                { name: "Thu", posts: 0, engagement: 0 },
                { name: "Fri", posts: totalPosts, engagement: totalLikes },
                { name: "Sat", posts: 0, engagement: 0 },
                { name: "Sun", posts: 0, engagement: 0 },
            ],
            metrics: {
                impressions: String(totalLikes * 10),
                followers: "0",
                engagement: totalPosts > 0
                    ? `${((totalLikes / (totalPosts * 100)) * 100).toFixed(1)}%`
                    : "0%",
                views: String(totalLikes * 15),
            },
        };

        await db.collection("analytics").doc(uid).collection("dashboard").doc("data")
            .set(dashboardData, { merge: true });

        res.json({ success: true, data: dashboardData });
    } catch (error: any) {
        sendError(res, error, "Failed to fetch Reddit analytics.");
    }
});
