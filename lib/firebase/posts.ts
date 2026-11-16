import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { FirebaseFunctions } from "./functions";
import type { PublishOutcome } from "@/types/research";
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
 * Publish right away through the `publishNow` callable. The server creates the post, claims it and
 * publishes it once per platform (same safe path as scheduled posts) and records the result.
 * Returns the outcome; throws when it didn't go out.
 */
export const publishPostNow = async (
  _userId: string,
  content: string,
  articleUrl?: string,
  imageUrl?: string,
  options: { linkedin?: boolean; reddit?: boolean; subreddit?: string; postId?: string } = { linkedin: true }
): Promise<PublishOutcome> => {
  const { linkedin = false, reddit = false, subreddit, postId } = options;
  const platforms = [...(linkedin ? ["linkedin"] : []), ...(reddit ? ["reddit"] : [])];
  if (!platforms.length) throw new Error("No platform selected.");

  const call = httpsCallable<Record<string, unknown>, PublishOutcome>(functions, FirebaseFunctions.PUBLISH_NOW, { timeout: 130_000 });
  const { data } = await call({
    ...(postId ? { postId } : {}),
    content,
    platforms,
    ...(articleUrl ? { articleUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(subreddit ? { subreddit } : {}),
  });
  if (data.status !== "PUBLISHED") {
    throw new Error(data.error || (data.status === "RETRY_PENDING" ? "The network is busy. We'll retry shortly." : "Publishing failed."));
  }
  return data;
};
