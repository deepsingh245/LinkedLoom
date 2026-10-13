import { collection, doc, getDoc, getDocs, limit, orderBy, query, type DocumentData } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { Collections } from "./collections";
import { FirebaseFunctions } from "./functions";
import type {
  AIConnection,
  AIProviderId,
  CreditWallet,
  LedgerEntry,
  TestGenerationResult,
  UsageRecord,
} from "@/types/ai";

// All of this lives in the personal workspace (workspaces/{uid}); clients only read.

const toDate = (value: unknown): Date | undefined => {
  const v = value as { toDate?: () => Date } | Date | undefined;
  return v && typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate() : (v as Date | undefined);
};

const withDates = <T>(id: string, data: DocumentData): T =>
  ({
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    ...(data.lastValidatedAt ? { lastValidatedAt: toDate(data.lastValidatedAt) } : {}),
    ...(data.updatedAt ? { updatedAt: toDate(data.updatedAt) } : {}),
  }) as T;

const ws = (uid: string, sub: string) => collection(db, Collections.WORKSPACES, uid, sub);

export const getAIConnections = async (uid: string): Promise<AIConnection[]> => {
  const snap = await getDocs(query(ws(uid, "aiConnections"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => withDates<AIConnection>(d.id, d.data())).filter((c) => c.status !== "revoked");
};

export const getCreditWallet = async (uid: string): Promise<CreditWallet> => {
  const snap = await getDoc(doc(db, Collections.WORKSPACES, uid, "creditWallets", "main"));
  const data = snap.data();
  const balance = (data?.balance as number) ?? 0;
  const reserved = (data?.reserved as number) ?? 0;
  return { balance, reserved, available: Math.max(0, balance - reserved), updatedAt: toDate(data?.updatedAt) };
};

export const getCreditLedger = async (uid: string, max = 50): Promise<LedgerEntry[]> => {
  const snap = await getDocs(query(ws(uid, "creditLedger"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => withDates<LedgerEntry>(d.id, d.data()));
};

export const getUsageRecords = async (uid: string, max = 100): Promise<UsageRecord[]> => {
  const snap = await getDocs(query(ws(uid, "usageRecords"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => withDates<UsageRecord>(d.id, d.data()));
};

export const addAIConnection = async (input: { provider: AIProviderId; label: string; apiKey: string }) => {
  const call = httpsCallable<typeof input, AIConnection>(functions, FirebaseFunctions.ADD_AI_CONNECTION);
  return (await call(input)).data;
};

export const testAIConnection = async (connectionId: string) => {
  const call = httpsCallable<{ connectionId: string }, { id: string; status: string; message: string }>(
    functions,
    FirebaseFunctions.TEST_AI_CONNECTION
  );
  return (await call({ connectionId })).data;
};

export const revokeAIConnection = async (connectionId: string) => {
  const call = httpsCallable<{ connectionId: string }, { id: string; detachedPersonas: number }>(
    functions,
    FirebaseFunctions.REVOKE_AI_CONNECTION
  );
  return (await call({ connectionId })).data;
};

export const testPersonaGeneration = async (personaId: string, topic?: string) => {
  const call = httpsCallable<{ personaId: string; topic?: string }, TestGenerationResult>(
    functions,
    FirebaseFunctions.TEST_PERSONA_GENERATION,
    { timeout: 130_000 }
  );
  return (await call({ personaId, ...(topic ? { topic } : {}) })).data;
};
