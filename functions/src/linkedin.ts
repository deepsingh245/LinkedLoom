import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";

// LinkedIn Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const LINKEDIN_SCOPE = "openid profile email";

export const getLinkedInAuthUrl = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const state = Math.random().toString(36).substring(7);
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    LINKEDIN_REDIRECT_URI || ""
  )}&state=${state}&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;

  return { url: authUrl, state };
});

export const exchangeLinkedInToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { code, redirect_uri } = request.data;
  const uid = request.auth.uid;

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirect_uri || LINKEDIN_REDIRECT_URI);
    params.append("client_id", LINKEDIN_CLIENT_ID || "");
    params.append("client_secret", LINKEDIN_CLIENT_SECRET || "");

    const tokenResponse = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, expires_in, refresh_token } = tokenResponse.data;

    // Fetch User Profile
    const profileResponse = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profileData = profileResponse.data;
    
    // Store in Firestore
    const db = admin.firestore();
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + expires_in * 1000);

    await db.collection("users").doc(uid).collection("connections").doc("linkedin").set({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expiresAt,
      providerUserId: profileData.sub,
      name: profileData.name,
      email: profileData.email,
      picture: profileData.picture,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("LinkedIn Exchange Error:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to link LinkedIn account.", error.message);
  }
});

export async function publishToLinkedIn(connection: any, content: string) {
  console.log("Publishing to LinkedIn...", content.substring(0, 20));
  
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
    const response = await axios.post("https://api.linkedin.com/v2/ugcPosts", payload, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("LinkedIn Publish Error:", error.response?.data || error.message);
    throw error;
  }
}
