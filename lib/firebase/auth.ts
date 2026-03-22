import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, User, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Collections } from "./collections";

const googleProvider = new GoogleAuthProvider();

export const registerWithEmailAndPassword = async (email: string, password: string, displayName: string): Promise<User | null> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName });
            const userRef = doc(db, Collections.USERS, userCredential.user.uid);
            await setDoc(userRef, {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                displayName,
                createdAt: new Date()
            });
            return userCredential.user;
        }
        return null;
    } catch (error: any) {
        console.error("Registration error:", error);
        throw error;
    }
};

export const loginWithEmailAndPassword = async (email: string, password: string): Promise<User | null> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error: any) {
        console.error("Login error:", error);
        throw error;
    }
};
export const loginWithGoogle = async (): Promise<User | null> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userRef = doc(db, Collections.USERS, user.uid);
        const userSnap = await getDoc(userRef);

        // If user does not exist → create document
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date()
            });
        }

        return user;
    } catch (error: any) {
        console.error("Google login error:", error);
        throw error;
    }
};

export const getLinkedInAuthUrl = async () => {
    return {
        url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI}&state=${crypto.randomUUID()}&scope=r_liteprofile%20r_emailaddress`,
    };
};
