import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Post } from "@/types";
import { DashboardData } from "./interfaces";
import { Collections } from "./collections";

export const getScheduledPosts = async (userId: string): Promise<Post[]> => {
  try {
    const q = query(collection(db, Collections.POSTS), where("user_id", "==", userId), where("scheduledFor", ">", new Date()));
    const querySnapshot = await getDocs(q);
    const posts: Post[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...(data as any),
        scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : data.scheduledFor,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Post);
    });
    return posts;
  } catch (e) {
    console.error("Error getting scheduled posts: ", e);
    throw e;
  }
};

export const getAllPosts = async (userId: string): Promise<Post[]> => {
  try {
    const q = query(collection(db, Collections.POSTS), where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    const posts: Post[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...(data as any),
        scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : data.scheduledFor,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Post);
    });
    // Sort by createdAt descending
    return posts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
  } catch (e) {
    console.error("Error getting all posts: ", e);
    throw e;
  }
};

export const getDraftPosts = async (userId: string): Promise<Post[]> => {
  try {
    const q = query(collection(db, Collections.POSTS), where("user_id", "==", userId), where("status", "==", "DRAFT"));
    const querySnapshot = await getDocs(q);
    const posts: Post[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...(data as any),
        scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : data.scheduledFor,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Post);
    });
    return posts;
  } catch (e) {
    console.error("Error getting draft posts: ", e);
    throw e;
  }
};

export const createPost = async (postData: Partial<Post>): Promise<Post> => {
  try {
    const docRef = await addDoc(collection(db, "posts"), {
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: docRef.id, ...postData } as Post;
  } catch (e) {
    console.error("Error creating post: ", e);
    throw e;
  }
};

export const updatePost = async (postId: string, data: Partial<Post>): Promise<void> => {
  try {
    const docRef = doc(db, "posts", postId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  } catch (e) {
    console.error("Error updating post: ", e);
    throw e;
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "posts", postId));
  } catch (e) {
    console.error("Error deleting post: ", e);
    throw e;
  }
};

export const schedulePost = async (postId: string, scheduledFor: string): Promise<void> => {
  try {
    const docRef = doc(db, "posts", postId);
    await updateDoc(docRef, {
      scheduledFor: new Date(scheduledFor),
      status: "SCHEDULED",
      updatedAt: new Date(),
    });
  } catch (e) {
    console.error("Error scheduling post: ", e);
    throw e;
  }
};

export const unschedulePost = async (postId: string): Promise<void> => {
  try {
    const docRef = doc(db, "posts", postId);
    await updateDoc(docRef, {
      scheduledFor: null,
      status: "DRAFT",
      updatedAt: new Date(),
    });
  } catch (e) {
    console.error("Error unscheduling post: ", e);
    throw e;
  }
};

/**
 * Instantly publish a post to LinkedIn via the backend HTTP endpoint
 * and record it in Firestore as PUBLISHED.
 */
export const publishPostNow = async (
  userId: string,
  content: string,
  articleUrl?: string,
  imageUrl?: string,
  options: { linkedin?: boolean; reddit?: boolean; subreddit?: string } = { linkedin: true }
): Promise<any> => {
  try {
    const { linkedin = false, reddit = false, subreddit } = options;
    if (!linkedin && !reddit) throw new Error("No platform selected.");

    let linkedinData: any = null;
    let redditData: any = null;

    // 1. Call the backend HTTP endpoints to perform the actual platform API requests
    if (linkedin) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/publishToLinkedIn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          content,
          articleUrl,
          imageUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to publish to LinkedIn");
      }
      linkedinData = result.data;
    }

    if (reddit) {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("You must be logged in to publish to Reddit.");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/publishToReddit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ content, subreddit, imageUrl }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to publish to Reddit");
      }
      redditData = result.data;
    }

    // 2. Save the successful post to Firestore history
    await addDoc(collection(db, "posts"), {
      user_id: userId,
      content,
      articleUrl: articleUrl || null,
      imageUrl: imageUrl || null,
      linkedinUrn: linkedinData?.id || null, // URN tracking
      subreddit: subreddit || null,
      redditUrl: redditData?.postUrl || null,
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { linkedin: linkedinData, reddit: redditData, ...(linkedinData || {}) };
  } catch (error) {
    console.error("Error publishing post immediately: ", error);
    throw error;
  }
};
