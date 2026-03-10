import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { publishToLinkedInInternal } from "./linkedin";

export const checkScheduledPosts = onSchedule("every 10 minutes", async (event) => {
  const now = admin.firestore.Timestamp.now();
  const db = admin.firestore();

  try {
    const snapshot = await db.collection("posts")
      .where("status", "==", "SCHEDULED")
      .where("scheduledFor", "<=", now)
      .get();

    if (snapshot.empty) {
      console.log("No scheduled posts to publish.");
      return;
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
  } catch (error) {
    console.error("Error checking scheduled posts:", error);
  }
});

// Internal helper to route to specific social platforms
async function publishPost(userId: string, post: any) {
  // 1. Get user connections
  const db = admin.firestore();
  
  // Fetch specific platforms
  const linkedinDoc = await db.collection("users").doc(userId).collection("connections").doc("linkedin").get();
  
  const results = [];
  let publishedAny = false;
  
  if (linkedinDoc.exists) {
    const linkedinConnection = linkedinDoc.data();
    try {
      const result = await publishToLinkedInInternal(linkedinConnection, post.content);
      // Update post with LinkedIn URN if successful
      if (result && result.id) {
          console.log("LinkedIn Publish Success:", result.id);
      }
      results.push(result);
      publishedAny = true;
    } catch (e) {
      console.error("LinkedIn Publish Failed", e);
      throw e; // Rethrow to mark as failed in the caller
    }
  }
  
  if (!publishedAny) {
      throw new Error("User has no social connections linked, or all publishing attempts failed.");
  }

  
  // Add other platforms here (like twitter) checking for doc.exists like above
  
  await Promise.all(results);
}

// TODO: Implement Twitter API v2 call
// async function publishToTwitter(token: any, content: string) {
//   console.log("Publishing to Twitter...", content.substring(0, 20));
// }
