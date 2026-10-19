import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export const functions = getFunctions(app);

/**
 * Where the browser talks to:
 * - "emulators": Auth + Firestore + Functions all local (NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true, dev only)
 * - "cloud":     everything on the configured Firebase project
 * - "mixed":     callables on the local Functions emulator, but Auth/Firestore reads on the cloud project.
 *                Emulated functions write to the *local* Firestore emulator, so anything saved through a
 *                callable (personas, AI keys, drafts…) never shows up in the browser. Avoid this mode.
 */
export type FirebaseMode = "emulators" | "cloud" | "mixed";

const apiUrlIsLocal = !!process.env.NEXT_PUBLIC_API_URL && /127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_API_URL);

export const firebaseMode: FirebaseMode =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
    ? "emulators"
    : apiUrlIsLocal
      ? "mixed"
      : "cloud";

// Explicit local mode keeps browser test accounts and data off the configured cloud project.
if (firebaseMode === "emulators") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
} else if (firebaseMode === "mixed") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  if (typeof window !== "undefined") {
    console.warn(
      "[LinkedLoom] Mixed Firebase mode: callables run on the local emulator, but sign-in and Firestore reads use the cloud project. " +
        "Data saved through Cloud Functions (personas, AI keys, drafts) will NOT appear. " +
        "Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in .env.local (and sign up a local test account), or point NEXT_PUBLIC_API_URL at the deployed functions."
    );
  }
}

export const storage = getStorage(app);

