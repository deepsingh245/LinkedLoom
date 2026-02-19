import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, User } from "firebase/auth";
import { app, createDocument } from "./utils"; // Assuming createDocument is in utils.ts
import { Collections } from "./collections";

const auth = getAuth(app);

export const registerWithEmailAndPassword = async (email: string, password: string, displayName: string): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      // Optionally, store user data in Firestore
      await createDocument(Collections.USERS, { uid: userCredential.user.uid, email: userCredential.user.email, displayName });
      return userCredential.user;
    }
    return null;
  } catch (error: Error) {
    console.error("Error registering with email and password: ", error);
    throw error;
  }
};

export const loginWithEmailAndPassword = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: Error) {
    console.error("Error logging in with email and password: ", error);
    throw error;
  }
};

export const getLinkedInAuthUrl = async () => {
  // In a real application, this would involve Firebase's LinkedIn provider
  // or a backend function to generate the LinkedIn auth URL.
  // For now, returning a placeholder URL.
  console.warn("LinkedIn authentication not fully implemented.");
  return {
    url: "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&state=YOUR_STATE&scope=r_liteprofile%20r_emailaddress",
  };
};
