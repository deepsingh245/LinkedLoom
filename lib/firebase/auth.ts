import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, User, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, createDocument } from "../firebase";
import { Collections } from "./collections";

const googleProvider = new GoogleAuthProvider();

export const registerWithEmailAndPassword = async (email: string, password: string, displayName: string): Promise<User | null> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName });
            await createDocument(Collections.USERS, {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                displayName
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
        
        // Always attempt to create/update user document on login to ensure it exists
        await createDocument(Collections.USERS, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        });
        
        return user;
    } catch (error: any) {
        console.error("Google login error:", error);
        throw error;
    }
};

export const getLinkedInAuthUrl = async () => {
    // Placeholder for future LinkedIn integration
    return {
        url: "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&state=YOUR_STATE&scope=r_liteprofile%20r_emailaddress",
    };
};
