import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { FirebaseFunctions } from "./functions";
import type { PublishPlatform } from "@/types";
import type { PublishOutcome } from "@/types/research";

/** When the publishing scheduler last finished a run (null if it never reported or can't be read). */
export const getPublisherHeartbeat = async (): Promise<{ lastRunAt: Date } | null> => {
  try {
    const snap = await getDoc(doc(db, "system", "publisher"));
    const value = snap.data()?.lastRunAt as { toDate?: () => Date } | undefined;
    return value && typeof value.toDate === "function" ? { lastRunAt: value.toDate() } : null;
  } catch {
    return null;
  }
};

/** Publish an existing post right now (e.g. a MISSED one the user chose to publish). */
export const publishPostById = async (postId: string) => {
  const call = httpsCallable<{ postId: string }, PublishOutcome>(functions, FirebaseFunctions.PUBLISH_NOW, { timeout: 130_000 });
  return (await call({ postId })).data;
};

/** The user says a PUBLISHED post isn't on the network: publish it again (that network only). */
export const republishPost = async (postId: string, platform: PublishPlatform = "linkedin") => {
  const call = httpsCallable<{ postId: string; platform: PublishPlatform }, PublishOutcome>(functions, FirebaseFunctions.REPUBLISH_POST, { timeout: 130_000 });
  return (await call({ postId, platform })).data;
};
