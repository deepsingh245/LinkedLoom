import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import * as crypto from "crypto";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const REDDIT_SCOPE = "identity submit read";

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
    return;
});

/**
 * Exchange Reddit OAuth code for tokens and store the connection under the authenticated user's UID.
 * Requires the caller to pass their Firebase ID token so we can associate the Reddit account
 * with their existing LinkedLoom account without relying on email (Reddit doesn't expose it).
 */
export const exchangeRedditToken = onRequest({ cors: true }, async (req, res) => {
    const { code, state, idToken } = req.body;

    if (!code || !state) {
        throw new HttpsError("invalid-argument", "Missing OAuth parameters.");
    }
    if (!idToken) {
        throw new HttpsError("unauthenticated", "Firebase ID token is required.");
    }

    try {
        // Validate and consume CSRF state
        const stateDoc = await db.collection("oauthStates").doc(state).get();
        if (!stateDoc.exists) {
            throw new HttpsError("permission-denied", "Invalid OAuth state.");
        }
        await stateDoc.ref.delete();

        // Identify the currently logged-in user from the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { clientId, clientSecret, redirectUri } = getRedditConfig();
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        // Exchange authorization code for access + refresh tokens
        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", redirectUri);

        const tokenResponse = await axios.post(
            "https://www.reddit.com/api/v1/access_token",
            params,
            {
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "LinkedLoom/1.0",
                },
                timeout: 10000,
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        if (!access_token) {
            throw new HttpsError("internal", "Failed to obtain Reddit access token.");
        }

        // Fetch Reddit user profile (id, name, icon_img)
        const profileResponse = await axios.get("https://oauth.reddit.com/api/v1/me", {
            headers: {
                Authorization: `Bearer ${access_token}`,
                "User-Agent": "LinkedLoom/1.0",
            },
            timeout: 10000,
        });

        const profileData = profileResponse.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        // Mark reddit field on the user profile (presence = connected)
        const userRef = db.collection("users").doc(uid);
        await userRef.set({ reddit: profileData.name, updatedAt: new Date() }, { merge: true });

        // Store connection credentials
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
        if (!existingConnection.exists) {
            connectionPayload.createdAt = new Date();
        }
        await connectionRef.set(connectionPayload, { merge: true });

        console.log(`Reddit connected for user ${uid} (@${profileData.name})`);
        res.json({ success: true });
        return;
    } catch (error: any) {
        console.error("Reddit Exchange Error:", error.response?.data || error.message);
        throw new HttpsError("internal", "Failed to link Reddit account.", error.message);
    }
});

async function refreshRedditAccessToken(connection: any): Promise<string> {
    const { clientId, clientSecret } = getRedditConfig();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", connection.refreshToken);

    const response = await axios.post(
        "https://www.reddit.com/api/v1/access_token",
        params,
        {
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "LinkedLoom/1.0",
            },
            timeout: 10000,
        }
    );

    return response.data.access_token;
}

/**
 * Internal helper used by the scheduler and the HTTP endpoint.
 * Handles token refresh, builds the Reddit submission payload, and posts it.
 */
export async function publishToRedditInternal(
    connection: any,
    content: string,
    subreddit?: string,
    imageUrl?: string
) {
    let accessToken = connection.accessToken;

    // Refresh the access token if it has expired
    const expiresAt = connection.expiresAt?.toDate
        ? connection.expiresAt.toDate()
        : new Date(connection.expiresAt);
    if (expiresAt <= new Date()) {
        if (!connection.refreshToken) {
            throw new Error("Reddit access token expired and no refresh token available.");
        }
        accessToken = await refreshRedditAccessToken(connection);
    }

    // Default to the user's own profile page (r/u_username) if no subreddit is specified
    const targetSubreddit = subreddit || `u_${connection.name}`;

    // Use the first line as title, the rest as body text
    const lines = content.trim().split("\n");
    const title = lines[0].substring(0, 300);
    const body = lines.slice(1).join("\n").trim() || "";

    const params = new URLSearchParams();
    params.append("sr", targetSubreddit);
    params.append("title", title);
    params.append("resubmit", "true");
    params.append("nsfw", "false");
    params.append("spoiler", "false");
    params.append("api_type", "json");

    // Use a link post for external images, self post otherwise
    if (imageUrl && !imageUrl.startsWith("data:")) {
        params.append("kind", "link");
        params.append("url", imageUrl);
    } else {
        params.append("kind", "self");
        params.append("text", body);
    }

    const response = await axios.post(
        "https://oauth.reddit.com/api/submit",
        params,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "LinkedLoom/1.0",
            },
            timeout: 10000,
        }
    );

    const result = response.data?.json;
    if (result?.errors?.length > 0) {
        throw new Error(`Reddit submission error: ${JSON.stringify(result.errors)}`);
    }

    return { postUrl: result?.data?.url as string | undefined, postId: result?.data?.id as string | undefined };
}

/**
 * Publish a post to Reddit (HTTP endpoint)
 */
export const publishToReddit = onRequest({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    const { userId, content, subreddit, imageUrl } = req.body;
    if (!userId || !content) {
        throw new HttpsError("invalid-argument", "Missing userId or content.");
    }

    try {
        const connectionDoc = await db
            .collection("users").doc(userId)
            .collection("connections").doc("reddit")
            .get();

        if (!connectionDoc.exists) {
            throw new HttpsError("failed-precondition", "No Reddit connection found for this user.");
        }

        const connection = connectionDoc.data()!;
        if (!connection.accessToken) {
            throw new HttpsError("failed-precondition", "Missing Reddit access token.");
        }

        const result = await publishToRedditInternal(connection, content, subreddit, imageUrl);
        console.log("Reddit post published:", result.postUrl);
        res.json({ success: true, data: result });
        return;
    } catch (error: any) {
        console.error("Reddit Publish Error:", error.response?.data || error.message);
        throw new HttpsError("internal", "Failed to publish to Reddit.", error.message);
    }
});

/**
 * Fetch basic Reddit analytics for a user
 */
export const getRedditAnalytics = onRequest({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    const { userId } = req.body;
    if (!userId) {
        throw new HttpsError("invalid-argument", "Missing userId.");
    }

    try {
        const connectionDoc = await db
            .collection("users").doc(userId)
            .collection("connections").doc("reddit")
            .get();

        if (!connectionDoc.exists) {
            res.json({ success: false, message: "No Reddit connection found.", data: null });
            return;
        }

        const connection = connectionDoc.data()!;
        let totalPosts = 0;
        let totalLikes = 0;
        let totalComments = 0;

        try {
            const postsResponse = await axios.get(
                `https://oauth.reddit.com/user/${connection.name}/submitted?limit=25`,
                {
                    headers: {
                        Authorization: `Bearer ${connection.accessToken}`,
                        "User-Agent": "LinkedLoom/1.0",
                    },
                    timeout: 10000,
                }
            );

            const posts = postsResponse.data?.data?.children || [];
            totalPosts = posts.length;
            totalLikes = posts.reduce((sum: number, p: any) => sum + (p.data.score || 0), 0);
            totalComments = posts.reduce((sum: number, p: any) => sum + (p.data.num_comments || 0), 0);
        } catch (apiError: any) {
            console.warn("Could not fetch Reddit posts, falling back to local DB:", apiError.message);
            const localPosts = await db.collection("posts")
                .where("user_id", "==", userId)
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

        await db.collection("analytics").doc(userId).collection("dashboard").doc("data")
            .set(dashboardData, { merge: true });

        res.json({ success: true, data: dashboardData });
        return;
    } catch (error: any) {
        console.error("Reddit Analytics Error:", error);
        throw new HttpsError("internal", "Failed to fetch Reddit analytics.", error.message);
    }
});
