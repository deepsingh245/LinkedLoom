import { collection, doc, getDoc, getDocs, orderBy, query, type DocumentData } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { Collections } from "./collections";
import { FirebaseFunctions } from "./functions";
import type { AutopilotSettings, Persona, PersonaInput, PersonaStatus } from "@/types/autopilot";

// Personal workspace id == the user's uid (see functions/src/autopilot/workspace.ts).

type FirestoreDate = { toDate: () => Date } | Date | undefined;

const toDate = (value: unknown): Date | undefined => {
  const v = value as FirestoreDate;
  return v && "toDate" in v ? v.toDate() : (v as Date | undefined);
};

const toPersona = (id: string, data: DocumentData): Persona => ({
  ...(data as Persona),
  id,
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
  nextRunAt: toDate(data.nextRunAt),
  lastRunAt: toDate(data.lastRunAt),
});

export const getPersonas = async (uid: string): Promise<Persona[]> => {
  try {
    const q = query(
      collection(db, Collections.WORKSPACES, uid, "personas"),
      orderBy("updatedAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toPersona(d.id, d.data()));
  } catch (e) {
    console.error("Error getting personas: ", e);
    throw e;
  }
};

export const getPersona = async (uid: string, personaId: string): Promise<Persona | null> => {
  try {
    const snap = await getDoc(doc(db, Collections.WORKSPACES, uid, "personas", personaId));
    return snap.exists() ? toPersona(snap.id, snap.data()) : null;
  } catch (e) {
    console.error("Error getting persona: ", e);
    throw e;
  }
};

export const getAutopilotSettings = async (uid: string): Promise<AutopilotSettings> => {
  try {
    const snap = await getDoc(doc(db, Collections.WORKSPACES, uid, "settings", "config"));
    if (!snap.exists()) return { autopilotEnabled: true };
    const data = snap.data();
    return { autopilotEnabled: data.autopilotEnabled !== false, updatedAt: toDate(data.updatedAt) };
  } catch (e) {
    console.error("Error getting autopilot settings: ", e);
    throw e;
  }
};

// Writes go through callable Cloud Functions; clients have read-only access.

export const createPersona = async (persona: PersonaInput) => {
  const call = httpsCallable<PersonaInput, { id: string; version: number }>(functions, FirebaseFunctions.CREATE_PERSONA);
  return (await call(persona)).data;
};

export const updatePersona = async (personaId: string, expectedVersion: number, persona: PersonaInput) => {
  const call = httpsCallable<
    { personaId: string; expectedVersion: number; persona: PersonaInput },
    { id: string; version: number }
  >(functions, FirebaseFunctions.UPDATE_PERSONA);
  return (await call({ personaId, expectedVersion, persona })).data;
};

export const setPersonaStatus = async (personaId: string, status: PersonaStatus) => {
  const call = httpsCallable<{ personaId: string; status: PersonaStatus }, { id: string; status: PersonaStatus }>(
    functions,
    FirebaseFunctions.SET_PERSONA_STATUS
  );
  return (await call({ personaId, status })).data;
};

export const deletePersona = async (personaId: string) => {
  const call = httpsCallable<{ personaId: string }, { id: string; deleted: boolean }>(
    functions,
    FirebaseFunctions.DELETE_PERSONA
  );
  return (await call({ personaId })).data;
};

export const setAutopilotEnabled = async (enabled: boolean) => {
  const call = httpsCallable<{ enabled: boolean }, { autopilotEnabled: boolean }>(
    functions,
    FirebaseFunctions.SET_AUTOPILOT_ENABLED
  );
  return (await call({ enabled })).data;
};
