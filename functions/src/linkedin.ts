import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import * as crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// LinkedIn Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const LINKEDIN_SCOPE = "openid profile email";

if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_REDIRECT_URI) {
  throw new Error("Missing LinkedIn environment variables");
}

/**
 * Generate LinkedIn OAuth URL
 */
export const getLinkedInAuthUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const uid = request.auth.uid;

  const state = crypto.randomUUID();

  // Save state for CSRF protection
  await db
    .collection("users")
    .doc(uid)
    .collection("oauthStates")
    .doc(state)
    .set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}` +
    `&state=${state}` +
    `&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;

  return { url: authUrl, state };
});

/**
 * Exchange LinkedIn OAuth code for tokens
 */
export const exchangeLinkedInToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const uid = request.auth.uid;
  const { code, state } = request.data;

  if (!code || !state) {
    throw new HttpsError("invalid-argument", "Missing OAuth parameters.");
  }

  try {
    // Validate OAuth state
    const stateDoc = await db
      .collection("users")
      .doc(uid)
      .collection("oauthStates")
      .doc(state)
      .get();

    if (!stateDoc.exists) {
      throw new HttpsError("permission-denied", "Invalid OAuth state.");
    }

    // Delete state after use
    await stateDoc.ref.delete();

    // Prevent duplicate connections
    const connectionRef = db
      .collection("users")
      .doc(uid)
      .collection("connections")
      .doc("linkedin");

    const existingConnection = await connectionRef.get();

    if (existingConnection.exists) {
      throw new HttpsError("already-exists", "LinkedIn already connected.");
    }

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

    const expiresAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + expires_in * 1000
    );

    const refreshExpiresAt = refresh_token_expires_in
      ? admin.firestore.Timestamp.fromMillis(
          Date.now() + refresh_token_expires_in * 1000
        )
      : null;

    // Store LinkedIn connection
    await connectionRef.set({
      provider: "linkedin",
      providerUserId: profileData.sub,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      expiresAt: expiresAt,
      refreshExpiresAt: refreshExpiresAt,
      name: profileData.name,
      email: profileData.email,
      picture: profileData.picture,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`LinkedIn account connected for user ${uid}`);

    return { success: true };
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