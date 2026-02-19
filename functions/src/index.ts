import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();

// Initialize Gemini API
// ERROR: API key should be in environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ... imports

export const generatePost = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // ... existing code
});

export const checkScheduledPosts = functions.pubsub.schedule("every 10 minutes").onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  const db = admin.firestore();

  try {
    const snapshot = await db.collection("posts")
      .where("status", "==", "SCHEDULED")
      .where("scheduledFor", "<=", now)
      .get();

    if (snapshot.empty) {
      console.log("No scheduled posts to publish.");
      return null;
    }

    const promises = snapshot.docs.map(async (doc) => {
      const post = doc.data();
      try {
        await publishPost(post.user_id, post);
        await doc.ref.update({ status: "PUBLISHED", publishedAt: now });
        console.log(`Published post ${doc.id}`);
      } catch (error) {
        console.error(`Failed to publish post ${doc.id}:`, error);
        await doc.ref.update({ status: "FAILED", error: String(error) });
      }
    });

    await Promise.all(promises);
    return null;
  } catch (error) {
    console.error("Error checking scheduled posts:", error);
    return null;
  }
});

// Internal helper to route to specific social platforms
async function publishPost(userId: string, post: any) {
  // 1. Get user connections
  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(userId).collection("connections").doc("socials").get();
  
  if (!userDoc.exists) {
    throw new Error("User has no social connections linked.");
  }
  
  const connections = userDoc.data();
  
  // 2. Publish based on connected platforms (Placeholders)
  const results = [];
  
  if (connections?.linkedin) {
    results.push(publishToLinkedIn(connections.linkedin, post.content));
  }
  
  if (connections?.twitter) {
    results.push(publishToTwitter(connections.twitter, post.content));
  }

  // Add other platforms here
  
  await Promise.all(results);
}

async function publishToLinkedIn(token: any, content: string) {
  console.log("Publishing to LinkedIn...", content.substring(0, 20));
  // TODO: Implement LinkedIn API call
  // Endpoint: https://api.linkedin.com/v2/ugcPosts
}

async function publishToTwitter(token: any, content: string) {
  console.log("Publishing to Twitter...", content.substring(0, 20));
  // TODO: Implement Twitter API v2 call
  // Endpoint: https://api.twitter.com/2/tweets
}
