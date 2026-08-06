import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Collections } from "./collections";
import { UserProfile } from "@/types";

/**
 * Get user profile from Firestore
 * @param uid 
 * @returns 
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, Collections.USERS, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    throw error;
  }
};

/**
 * Update user profile in Firestore
 * @param uid 
 * @param data 
 * @returns 
 */
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  try {
    const docRef = doc(db, Collections.USERS, uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating user profile: ", error);
    throw error;
  }
};

/**
 * Listen for user profile updates
 * @param uid 
 * @param callback 
 * @returns 
 */
export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const docRef = doc(db, Collections.USERS, uid);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ uid: doc.id, ...doc.data() } as UserProfile);
    } else {
      callback(null);
    }
  });
};
