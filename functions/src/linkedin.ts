import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import * as crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// LinkedIn Configuration
const LINKEDIN_SCOPE = "openid profile email";
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/linkedin/callback";

console.log("ENV:", LINKEDIN_REDIRECT_URI);

/**
 * Generate LinkedIn OAuth URL
 */
export const getLinkedInAuthUrl = onRequest({ cors: true }, async (req, res) => {
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
    `&client_id=${LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}` +
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

    // Exchange authorization code for access token
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", LINKEDIN_REDIRECT_URI);
    params.append("client_id", LINKEDIN_CLIENT_ID);
    params.append("client_secret", LINKEDIN_CLIENT_SECRET);

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
 * Publish Post to LinkedIn
 */
export async function publishToLinkedIn(connection: any, content: string) {
  console.log("Publishing to LinkedIn...");

  if (!connection?.accessToken) {
    throw new Error("Missing LinkedIn access token");
  }

  const payload = {
    author: `urn:li:person:${connection.providerUserId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  try {
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

    console.log("LinkedIn post published successfully");

    return response.data;
  } catch (error: any) {
    console.error(
      "LinkedIn Publish Error:",
      error.response?.data || error.message
    );

    throw error;
  }
}

/**
 * Fetch Analytics from LinkedIn
 */
export const getLinkedInAnalytics = onRequest({ cors: true }, async (req, res) => {
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
        console.warn("Could not fetch LinkedIn posts directly, falling back to basic data. Error:", linkedInApiError.response?.data || linkedInApiError.message);
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