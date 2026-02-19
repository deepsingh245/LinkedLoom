// lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);


export const createDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const getDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (e) {
    console.error("Error getting document: ", e);
    throw e;
  }
};

export const getAllDocuments = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents: any[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return documents;
  } catch (e) {
    console.error("Error getting all documents: ", e);
    throw e;
  }
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
    return true;
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};

// CRUD functions for sub-collections
export const createSubDocument = async (parentCollectionName: string, parentId: string, subCollectionName: string, data: any) => {
  try {
    const subCollectionRef = collection(db, parentCollectionName, parentId, subCollectionName);
    const docRef = await addDoc(subCollectionRef, data);
    return docRef.id;
  } catch (e) {
    console.error("Error adding sub-document: ", e);
    throw e;
  }
};

export const getSubDocument = async (parentCollectionName: string, parentId: string, subCollectionName: string, subDocumentId: string) => {
  try {
    const docRef = doc(db, parentCollectionName, parentId, subCollectionName, subDocumentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No such sub-document!");
      return null;
    }
  } catch (e) {
    console.error("Error getting sub-document: ", e);
    throw e;
  }
};

export const getAllSubDocuments = async (parentCollectionName: string, parentId: string, subCollectionName: string) => {
  try {
    const subCollectionRef = collection(db, parentCollectionName, parentId, subCollectionName);
    const querySnapshot = await getDocs(subCollectionRef);
    const documents: any[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return documents;
  } catch (e) {
    console.error("Error getting all sub-documents: ", e);
    throw e;
  }
};

export const updateSubDocument = async (parentCollectionName: string, parentId: string, subCollectionName: string, subDocumentId: string, data: any) => {
  try {
    const docRef = doc(db, parentCollectionName, parentId, subCollectionName, subDocumentId);
    await updateDoc(docRef, data);
    return true;
  } catch (e) {
    console.error("Error updating sub-document: ", e);
    throw e;
  }
};

export const deleteSubDocument = async (parentCollectionName: string, parentId: string, subCollectionName: string, subDocumentId: string) => {
  try {
    const docRef = doc(db, parentCollectionName, parentId, subCollectionName, subDocumentId);
    await deleteDoc(docRef);
    return true;
  } catch (e) {
    console.error("Error deleting sub-document: ", e);
    throw e;
  }
};

// Example of querying documents
export const queryDocuments = async (collectionName: string, field: string, operator: "==" | "<" | "<=" | ">" | ">=" | "!=" | "array-contains" | "array-contains-any" | "in" | "not-in", value: any) => {
  try {
    const q = query(collection(db, collectionName), where(field, operator, value));
    const querySnapshot = await getDocs(q);
    const documents: any[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return documents;
  } catch (e) {
    console.error("Error querying documents: ", e);
    throw e;
  }
};

export const getScheduledPosts = async (userId: string) => {
  try {
    const q = query(collection(db, "posts"), where("userId", "==", userId), where("scheduledFor", ">", new Date()));
    const querySnapshot = await getDocs(q);
    const posts: any[] = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    return posts;
  } catch (e) {
    console.error("Error getting scheduled posts: ", e);
    throw e;
  }
};

export const getDraftPosts = async (userId: string) => {
  try {
    const q = query(collection(db, "posts"), where("userId", "==", userId), where("status", "==", "draft"));
    const querySnapshot = await getDocs(q);
    const posts: any[] = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    return posts;
  } catch (e) {
    console.error("Error getting draft posts: ", e);
    throw e;
  }
};

export const getAnalyticsDashboardData = async (userId: string) => {
  try {
    const docRef = doc(db, "analytics", userId, "dashboard", "data"); // Assuming a structure like analytics/userId/dashboard/data
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No analytics dashboard data found!");
      return null;
    }
  } catch (e) {
    console.error("Error getting analytics dashboard data: ", e);
    throw e;
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
