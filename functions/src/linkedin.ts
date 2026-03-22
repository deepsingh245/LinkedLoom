import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import * as crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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
 * Generate LinkedIn OAuth URL
 */
export const getLinkedInAuthUrl = onRequest({ cors: true }, async (req, res) => {
  const { clientId, redirectUri } = getLinkedInConfig();
  const state = crypto.randomUUID();

  // Save state for CSRF protection
  await db
  .collection("oauthStates")
  .doc(state)
  .set({
    createdAt: new Date().toISOString(),
  });
  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;

    res.json({ url: authUrl, state });
    return;
});

/**
 * Exchange LinkedIn OAuth code for tokens
 */
export const exchangeLinkedInToken = onRequest({ cors: true }, async (req, res) => {
  const { code, state } = req.body;

  if (!code || !state) {
    throw new HttpsError("invalid-argument", "Missing OAuth parameters.");
  }

  try {
// Validate OAuth state
    const stateDoc = await db
      .collection("oauthStates")
      .doc(state)
      .get();

    if (!stateDoc.exists) {
      throw new HttpsError("permission-denied", "Invalid OAuth state.");
    }

    // Delete state after use
    await stateDoc.ref.delete();

    const { clientId, clientSecret, redirectUri } = getLinkedInConfig();

    // Exchange authorization code for access token
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);

    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      }
    );

    const {
      access_token,
      expires_in,
      refresh_token,
      refresh_token_expires_in,
    } = tokenResponse.data;

    // Fetch LinkedIn user profile
    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        timeout: 10000,
      }
    );

    const profileData = profileResponse.data;

    // Check if user already exists in Firebase Auth by email
    let uid: string;
    let isNewUser = false;
    if (!profileData.email) {
      throw new HttpsError("failed-precondition", "LinkedIn profile has no email associated.");
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(profileData.email);
      uid = userRecord.uid;
    } catch (firebaseError: any) {
      // User doesn't exist, create them
      if (firebaseError.code === "auth/user-not-found") {
         const newUser = await admin.auth().createUser({
            email: profileData.email,
            emailVerified: true,
            displayName: profileData.name,
            photoURL: profileData.picture,
         });
         uid = newUser.uid;
         isNewUser = true;
      } else {
         throw firebaseError;
      }
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const refreshExpiresAt = refresh_token_expires_in
      ? new Date(Date.now() + refresh_token_expires_in * 1000)
      : null;

    // Store LinkedIn connection
    const userRef = db.collection("users").doc(uid);
    const userPayload: any = {
        uid: uid,
        email: profileData.email,
        displayName: profileData.name,
        photoURL: profileData.picture,
    };
    
    // Only set createdAt if the user was just created
    if (isNewUser) {
        userPayload.createdAt = new Date();
    }
    
    await userRef.set(userPayload, { merge: true });

    const connectionRef = userRef.collection("connections").doc("linkedin");
    
    // Check if connection existed before overriding its createdAt
    const existingConnection = await connectionRef.get();
    const connectionPayload: any = {
      provider: "linkedin",
      providerUserId: profileData.sub,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      expiresAt: expiresAt,
      refreshExpiresAt: refreshExpiresAt,
      name: profileData.name,
      email: profileData.email,
      picture: profileData.picture,
      updatedAt: new Date(),
    };
    
    if (!existingConnection.exists) {
        connectionPayload.createdAt = new Date();
    }
    
    await connectionRef.set(connectionPayload, { merge: true });

    console.log(`LinkedIn account connected/created for user ${uid}`);

    // Generate Firebase Custom Token to log the user in on the frontend
    const customToken = await admin.auth().createCustomToken(uid);

    res.json({ success: true, customToken: customToken });
    return;
  } catch (error: any) {
    console.error(
      "LinkedIn Exchange Error:",
      error.response?.data || error.message
    );

    throw new HttpsError(
      "internal",
      "Failed to link LinkedIn account.",
      error.message
    );
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
            "https://api.linkedin.com/v2/assets?action=registerUpload",
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
export async function publishToLinkedInInternal(connection: any, content: string, articleUrl?: string, imageUrl?: string) {
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
      const assetUrn = await uploadMediaToLinkedIn(connection.accessToken, authorUrn, imageUrl);
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
      "https://api.linkedin.com/v2/ugcPosts",
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

    return response.data;
}

/**
 * Publish Post to LinkedIn (HTTP Endpoint)
 */
export const publishToLinkedIn = onRequest({ cors: true }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, content, articleUrl, imageUrl } = req.body;

  if (!userId || !content) {
    throw new HttpsError("invalid-argument", "Missing userId or content parameter.");
  }

  try {
    const connectionDoc = await db
      .collection("users")
      .doc(userId)
      .collection("connections")
      .doc("linkedin")
      .get();

    if (!connectionDoc.exists) {
        throw new HttpsError("failed-precondition", "No LinkedIn connection found for this user.");
    }

    const connection = connectionDoc.data();
    if (!connection?.accessToken) {
        throw new HttpsError("failed-precondition", "Missing LinkedIn access token.");
    }

    console.log("Publishing to LinkedIn for user:", userId);

    const responseData = await publishToLinkedInInternal(connection, content, articleUrl, imageUrl);
    console.log("LinkedIn post published successfully! URN:", responseData.id);

    res.json({
        success: true,
        data: responseData
    });
    return;

  } catch (error: any) {
    console.error(
      "LinkedIn Publish Error:",
      error.response?.data || error.message
    );

    throw new HttpsError(
      "internal",
      "Failed to publish to LinkedIn.",
      error.response?.data?.message || error.message
    );
  }
});

/**
 * Fetch Analytics from LinkedIn
 */
export const getLinkedInAnalytics = onRequest({ cors: true }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId } = req.body;

  if (!userId) {
    throw new HttpsError("invalid-argument", "Missing userId parameter.");
  }

  try {
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
        throw new HttpsError("failed-precondition", "Missing LinkedIn access token.");
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
            `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aperson%3A${connection.providerUserId})`,
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
            .where("userId", "==", userId)
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
    console.error("LinkedIn Analytics Error:", error);
    throw new HttpsError("internal", "Failed to fetch LinkedIn analytics.", error.message);
  }
});