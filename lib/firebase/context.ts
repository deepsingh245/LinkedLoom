import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { Collections } from "./collections";
import { FirebaseFunctions } from "./functions";
import type { ContextDoc } from "@/types/research";

/** Limits mirrored from functions/src/autopilot/context/store.ts (the server enforces them). */
export const CONTEXT_LIMITS = {
  maxFiles: 10,
  maxCharsPerFile: 50_000,
  maxTotalChars: 200_000,
  promptChars: 12_000,
} as const;

const toDate = (value: unknown): Date | undefined => {
  const v = value as { toDate?: () => Date } | null | undefined;
  return v && typeof v.toDate === "function" ? v.toDate() : undefined;
};

export const getContextDocs = async (uid: string): Promise<ContextDoc[]> => {
  const snap = await getDocs(query(collection(db, Collections.WORKSPACES, uid, "contextDocs"), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<ContextDoc, "id" | "createdAt">), id: d.id, createdAt: toDate(d.data().createdAt) }));
};

/** Read a .md/.txt file in the browser and send its text to the server. */
export const addContextDoc = async (file: File, personaId: string | null) => {
  const call = httpsCallable<{ name: string; text: string; personaId: string | null }, { id: string; size: number }>(functions, FirebaseFunctions.ADD_CONTEXT_DOC);
  const text = await file.text();
  return (await call({ name: file.name, text, personaId })).data;
};

export const updateContextDoc = async (docId: string, patch: { enabled?: boolean; personaId?: string | null }) => {
  const call = httpsCallable<{ docId: string; enabled?: boolean; personaId?: string | null }, { id: string }>(functions, FirebaseFunctions.UPDATE_CONTEXT_DOC);
  return (await call({ docId, ...patch })).data;
};

export const deleteContextDoc = async (docId: string) => {
  const call = httpsCallable<{ docId: string }, { id: string; deleted: boolean }>(functions, FirebaseFunctions.DELETE_CONTEXT_DOC);
  return (await call({ docId })).data;
};
