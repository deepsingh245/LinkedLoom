import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./utils";
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



