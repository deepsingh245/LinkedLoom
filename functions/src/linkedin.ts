import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import * as crypto from "crypto";
import { authenticate, ApiError, sendError } from "./shared/http-auth";
import { isExpired } from "./publishing/errors";
import { decideLinkedInAccount, profileFieldsForLinkedIn, type LinkedInFacts, type LinkedInMode } from "./linkedin-identity";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * LinkedIn REST base URL. Tests can point it at a local fixture server, but only inside the
 * emulator – in production it is always the real API.
 */
export const linkedinApiBase = () =>
    process.env.FUNCTIONS_EMULATOR === "true" && process.env.LINKEDIN_API_BASE ? process.env.LINKEDIN_API_BASE.replace(/\/$/, "") : "https://api.linkedin.com";

// LinkedIn Configuration
const LINKEDIN_SCOPE = "openid profile email w_member_social";
const getLinkedInConfig = () => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

    if (!clientId) {
        throw new HttpsError("failed-precondition", "LINKEDIN_CLIENT_ID is not configured.");
    }
    if (!clientSecret) {
        throw new HttpsError("failed-precondition", "LINKEDIN_CLIENT_SECRET is not configured.");
    }
    if (!redirectUri) {
        throw new HttpsError("failed-precondition", "LINKEDIN_REDIRECT_URI is not configured.");
    }

    return { clientId, clientSecret, redirectUri };
};

/**
 * LinkedIn OAuth (token) base URL – test-only override, emulator only (same rule as linkedinApiBase).
 */
const linkedinOauthBase = () =>
    process.env.FUNCTIONS_EMULATOR === "true" && process.env.LINKEDIN_OAUTH_BASE ? process.env.LINKEDIN_OAUTH_BASE.replace(/\/$/, "") : "https://www.linkedin.com";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const identityRef = (sub: string) => db.collection("linkedinIdentities").doc(sub);
const connectionRef = (uid: string) => db.collection("users").doc(uid).collection("connections").doc("linkedin");

/**
 * Generate the LinkedIn OAuth URL.
 *  - Sent with the user's Firebase ID token (`Authorization: Bearer …`) → "connect": the state remembers the
 *    uid, so LinkedIn is attached to the account that is logged in (never a new one).
 *  - Sent without a token (login / register pages) → "login".
 */
export const getLinkedInAuthUrl = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  try {
    const { clientId, redirectUri } = getLinkedInConfig();
    // A token that is present but invalid is an error, not a silent downgrade to "login".
    const uid = req.headers.authorization ? await authenticate(req) : undefined;
    const state = crypto.randomUUID();

    await db.collection("oauthStates").doc(state).set({
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      mode: uid ? "connect" : "login",
      ...(uid ? { uid } : {}),
    });
    const authUrl =
      `https://www.linkedin.com/oauth/v2/authorization` +
      `?response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;

    res.json({ url: authUrl, state, mode: uid ? "connect" : "login" });
  } catch (error: any) {
    if (error instanceof HttpsError) {
      res.status(500).json({ success: false, message: error.message, error: { message: error.message } });
      return;
    }
    sendError(res, error, "Could not start LinkedIn sign-in.");
  }
});

/** Read and delete an OAuth state in one transaction: it can be used once, within its lifetime. */
async function consumeOAuthState(state: string): Promise<{ mode: LinkedInMode; uid?: string }> {
  const ref = db.collection("oauthStates").doc(state);
  const data = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    tx.delete(ref);
    return snap.data()!;
  });
  if (!data) throw new ApiError(403, "This LinkedIn sign-in link was already used or is invalid. Please start again.");
  const createdAtMs = Number(data.createdAtMs ?? Date.parse(String(data.createdAt ?? "")));
  if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > OAUTH_STATE_TTL_MS) {
    throw new ApiError(403, "This LinkedIn sign-in link expired. Please start again.");
  }
  return { mode: data.mode === "connect" && data.uid ? "connect" : "login", ...(data.uid ? { uid: String(data.uid) } : {}) };
}

/**
 * Exchange the LinkedIn OAuth code. Which account it belongs to is decided by `decideLinkedInAccount`:
 * a logged-in user's connection always goes to their own account; a login finds the linked account
 * (by LinkedIn id, then by verified email) and only creates a new one when there is none.
 * Returns a custom token only for logins.
 */
export const exchangeLinkedInToken = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  try {
    const { code, state } = req.body ?? {};
    if (typeof code !== "string" || typeof state !== "string" || !code || !state) throw new ApiError(400, "Missing OAuth parameters.");

    const oauthState = await consumeOAuthState(state);
    const { clientId, clientSecret, redirectUri } = getLinkedInConfig();

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);

    const tokenResponse = await axios.post(`${linkedinOauthBase()}/oauth/v2/accessToken`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    });
    const { access_token, expires_in, refresh_token, refresh_token_expires_in } = tokenResponse.data;

    const profileResponse = await axios.get(`${linkedinApiBase()}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` },
      timeout: 10000,
    });
    const profile = profileResponse.data as { sub?: string; email?: string; email_verified?: boolean | string; name?: string; picture?: string };
    if (!profile.sub) throw new ApiError(502, "LinkedIn did not return a profile id.");
    const email = profile.email?.trim().toLowerCase() || undefined;
    const emailVerified = profile.email_verified === true || profile.email_verified === "true";

    // ---- gather the facts
    const identity = await identityRef(profile.sub).get();
    let emailUser: LinkedInFacts["emailUser"];
    if (oauthState.mode === "login" && !identity.exists && email) {
      try {
        const record = await admin.auth().getUserByEmail(email);
        const existing = (await connectionRef(record.uid).get()).data();
        emailUser = { uid: record.uid, emailVerified: record.emailVerified, ...(existing?.providerUserId ? { linkedinSub: String(existing.providerUserId) === profile.sub ? undefined : String(existing.providerUserId) } : {}) };
      } catch (firebaseError: any) {
        if (firebaseError.code !== "auth/user-not-found") throw firebaseError;
      }
    }

    const decision = decideLinkedInAccount({
      mode: oauthState.mode,
      stateUid: oauthState.uid,
      identityUid: identity.exists ? String(identity.data()!.uid) : undefined,
      email,
      emailVerified,
      emailUser,
    });
    if (decision.action === "reject") throw new ApiError(decision.status, decision.message);

    // A stale link to an account that no longer exists must not mint a token for a ghost uid.
    if (decision.action === "login" && decision.via === "identity") {
      try {
        await admin.auth().getUser(decision.uid);
      } catch (firebaseError: any) {
        if (firebaseError.code === "auth/user-not-found") {
          await identityRef(profile.sub).delete();
          throw new ApiError(409, "The account linked to this LinkedIn profile no longer exists. Please try signing in again.");
        }
        throw firebaseError;
      }
    }

    // ---- carry it out
    let uid: string;
    if (decision.action === "create") {
      const created = await admin.auth().createUser({ email, emailVerified: true, displayName: profile.name, photoURL: profile.picture });
      uid = created.uid;
    } else {
      uid = decision.uid;
    }

    // Link the LinkedIn identity to this account (and drop the link of a LinkedIn profile this account used before).
    const previous = (await connectionRef(uid).get()).data();
    await db.runTransaction(async (tx) => {
      const current = await tx.get(identityRef(profile.sub!));
      if (current.exists && current.data()!.uid !== uid) throw new ApiError(409, "This LinkedIn account is already connected to a different LinkedLoom account.");
      tx.set(identityRef(profile.sub!), { uid, email: email ?? null, updatedAt: new Date(), ...(current.exists ? {} : { createdAt: new Date() }) }, { merge: true });
      if (previous?.providerUserId && String(previous.providerUserId) !== profile.sub) tx.delete(identityRef(String(previous.providerUserId)));
    });

    const userRef = db.collection("users").doc(uid);
    const existingProfile = (await userRef.get()).data() as { displayName?: string; photoURL?: string; email?: string } | undefined;
    await userRef.set(
      {
        uid,
        ...profileFieldsForLinkedIn(existingProfile, { name: profile.name, picture: profile.picture, email }),
        ...(existingProfile ? {} : { createdAt: new Date() }),
      },
      { merge: true }
    );

    await connectionRef(uid).set(
      {
        provider: "linkedin",
        providerUserId: profile.sub,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt: new Date(Date.now() + Number(expires_in) * 1000),
        refreshExpiresAt: refresh_token_expires_in ? new Date(Date.now() + Number(refresh_token_expires_in) * 1000) : null,
        name: profile.name ?? null,
        email: email ?? null,
        picture: profile.picture ?? null,
        updatedAt: new Date(),
        ...(previous ? {} : { createdAt: new Date() }),
      },
      { merge: true }
    );

    console.log(`LinkedIn ${oauthState.mode} for user ${uid}${decision.action === "create" ? " (new account)" : ""}`);

    // Only a login needs a token; a connect keeps the session the user already has.
    const customToken = oauthState.mode === "login" ? await admin.auth().createCustomToken(uid) : undefined;
    res.json({ success: true, mode: oauthState.mode, ...(customToken ? { customToken } : {}) });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("LinkedIn Exchange Error:", error.response?.status, error.response?.data?.error || error.message);
      sendError(res, new ApiError(502, "LinkedIn rejected the sign-in. Please try again."), "Failed to link LinkedIn account.");
      return;
    }
    if (error instanceof HttpsError) {
      res.status(500).json({ success: false, message: error.message, error: { message: error.message } });
      return;
    }
    sendError(res, error, "Failed to link LinkedIn account.");
  }
});

/**
 * Register and upload an image to LinkedIn
 */
export async function uploadMediaToLinkedIn(accessToken: string, personUrn: string, imageUrl: string) {
    try {
        console.log("Registering upload with LinkedIn...");
        // 1. Register the upload
        const registerResponse = await axios.post(
            `${linkedinApiBase()}/v2/assets?action=registerUpload`,
            {
                registerUploadRequest: {
                    recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                    owner: personUrn,
                    serviceRelationships: [
                        {
                            relationshipType: "OWNER",
                            identifier: "urn:li:userGeneratedContent"
                        }
                    ]
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                }
            }
        );

        const asset = registerResponse.data.value.asset;
        const uploadUrl = registerResponse.data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;

        console.log("Fetching image from URL:", imageUrl);
        // 2. Fetch the image content
        let imageData: Buffer;
        if (imageUrl.startsWith('data:')) {
            // Handle base64
            const base64Data = imageUrl.split(',')[1];
            imageData = Buffer.from(base64Data, 'base64');
        } else {
            // Handle URL
            const fetchResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            imageData = Buffer.from(fetchResponse.data);
        }

        console.log("Uploading image to LinkedIn...");
        // 3. Upload the image binary
        await axios.put(uploadUrl, imageData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/octet-stream",
            }
        });

        return asset;
    } catch (error: any) {
        console.error("LinkedIn Media Upload Error:", error.response?.data || error.message);
        throw new Error(`Failed to upload media to LinkedIn: ${error.message}`);
    }
}

/**
 * Internal helper for LinkedIn API submission
 */
export async function publishToLinkedInInternal(connection: any, content: string, articleUrl?: string, imageUrl?: string): Promise<any> {
    let shareMediaCategory = "NONE";
    const media: any[] = [];
    const authorUrn = `urn:li:person:${connection.providerUserId}`;
    
    if (articleUrl) {
      shareMediaCategory = "ARTICLE";
      media.push({
        status: "READY",
        originalUrl: articleUrl,
      });
    } else if (imageUrl) {
      shareMediaCategory = "IMAGE";
      let assetUrn: string;
      try {
        assetUrn = await uploadMediaToLinkedIn(connection.accessToken, authorUrn, imageUrl);
      } catch (error) {
        // Tag it: the post itself was never sent, so the publisher may safely retry.
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), { linkedinStage: "media" });
      }
      media.push({
        status: "READY",
        media: assetUrn,
      });
    }

    const payload: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: shareMediaCategory,
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    if (media.length > 0) {
        payload.specificContent["com.linkedin.ugc.ShareContent"].media = media;
    }

    const response = await axios.post(
      `${linkedinApiBase()}/v2/ugcPosts`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        timeout: 10000,
      }
    );

    // The URN of the new post is in the body (`id`) or the `x-restli-id` header.
    const id = response.data?.id || response.headers?.["x-restli-id"] || "";
    return { ...(response.data ?? {}), id };
}

/**
 * Publish Post to LinkedIn (HTTP Endpoint)
 */
export const publishToLinkedIn = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // The user comes from the verified ID token – never from the request body.
    const userId = await authenticate(req);
    const { content, articleUrl, imageUrl } = req.body ?? {};
    if (!content || typeof content !== "string") throw new ApiError(400, "Missing content.");

    const connectionDoc = await db.collection("users").doc(userId).collection("connections").doc("linkedin").get();
    const connection = connectionDoc.data();
    if (!connectionDoc.exists || !connection?.accessToken) throw new ApiError(412, "No LinkedIn connection found. Connect LinkedIn in Settings.");
    if (isExpired(connection.expiresAt)) throw new ApiError(412, "Your LinkedIn connection expired. Reconnect LinkedIn in Settings.");

    const responseData = await publishToLinkedInInternal(connection, content, articleUrl, imageUrl);
    console.log("LinkedIn post published. URN:", responseData.id);
    res.json({ success: true, data: responseData });
  } catch (error: any) {
    sendError(res, error, "Failed to publish to LinkedIn.");
  }
});

/**
 * Fetch Analytics from LinkedIn
 */
export const getLinkedInAnalytics = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const userId = await authenticate(req);
    // 1. Fetch the user's LinkedIn connection
    const connectionDoc = await db
      .collection("users")
      .doc(userId)
      .collection("connections")
      .doc("linkedin")
      .get();

    if (!connectionDoc.exists) {
        // If no LinkedIn connection, return default data or error
        res.json({
            success: false,
            message: "No LinkedIn connection found for this user.",
            data: null
        });
        return;
    }

    const connection = connectionDoc.data();
    
    if (!connection?.accessToken) {
        throw new ApiError(412, "Missing LinkedIn access token. Reconnect LinkedIn in Settings.");
    }

    // 2. Fetch recent posts from LinkedIn to build analytics
    // Note: LinkedIn's basic profile API has limited analytics access without special partner programs.
    // We will attempt to fetch UGC posts authored by the user.
    let totalPosts = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    
    try {
        const postsResponse = await axios.get(
            `${linkedinApiBase()}/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aperson%3A${connection.providerUserId})`,
            {
                headers: {
                    Authorization: `Bearer ${connection.accessToken}`,
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                timeout: 10000,
            }
        );
        
        const elements = postsResponse.data.elements || [];
        totalPosts = elements.length;
        
        // Note: Fetching socialActions (likes/comments) requires a separate call per post 
        // or specific permissions which basic apps might not have.
        // We will provide the posts count and mock the rest for the dashboard 
        // if real access is denied by LinkedIn's strict API boundaries.
        
    } catch (linkedInApiError: any) {
        if (linkedInApiError.response?.status === 403) {
            console.log("ℹ️ LinkedIn API restricted read access to posts (requires Marketing API approval). Falling back to local database stats.");
        } else {
            console.warn("⚠️ Could not fetch LinkedIn posts directly. Error:", linkedInApiError.response?.data?.message || linkedInApiError.message);
        }
        
        // Fallback to searching our local database for published posts if LinkedIn API blocks read access
        const localPostsSnapshot = await db.collection("posts")
            .where("user_id", "==", userId)
            .where("status", "==", "PUBLISHED")
            .get();
        totalPosts = localPostsSnapshot.size;
    }

    // 3. Construct DashboardData format
    const dashboardData = {
        totalPosts: totalPosts,
        totalLikes: totalLikes, // Would require socialActions API
        totalComments: totalComments, // Would require socialActions API
        totalShares: totalShares, 
        chartData: [
            { name: "Mon", posts: Math.floor(totalPosts * 0.1), engagement: 0 },
            { name: "Tue", posts: Math.floor(totalPosts * 0.2), engagement: 0 },
            { name: "Wed", posts: Math.floor(totalPosts * 0.3), engagement: 0 },
            { name: "Thu", posts: Math.floor(totalPosts * 0.4), engagement: 0 },
            { name: "Fri", posts: totalPosts, engagement: 0 },
            { name: "Sat", posts: 0, engagement: 0 },
            { name: "Sun", posts: 0, engagement: 0 },
        ],
        metrics: {
            impressions: "0",
            followers: "0",
            engagement: "0%",
            views: "0",
        }
    };

    // Optionally save it to Firestore to cache it
    await db.collection("analytics").doc(userId).collection("dashboard").doc("data").set(dashboardData, { merge: true });

    res.json({
        success: true,
        data: dashboardData
    });

  } catch (error: any) {
    sendError(res, error, "Failed to fetch LinkedIn analytics.");
  }
});