import type { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getFirestore } from "firebase-admin/firestore";

/** Where BYOK API keys live. Firestore only ever stores the returned reference. */
export interface SecretStore {
    create(secretId: string, value: string): Promise<string>;
    access(ref: string): Promise<string>;
    destroy(ref: string): Promise<void>;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { value: string; expires: number }>();

function cached(ref: string): string | undefined {
    const hit = cache.get(ref);
    if (hit && hit.expires > Date.now()) return hit.value;
    cache.delete(ref);
    return undefined;
}

/** Google Cloud Secret Manager: one secret per BYOK key (`byok-…`), automatic replication. */
class GcpSecretStore implements SecretStore {
    private client: SecretManagerServiceClient;

    constructor() {
        // Lazy: the client library is heavy (gRPC) and only needed for real BYOK key storage.
        const { SecretManagerServiceClient: Client } = require("@google-cloud/secret-manager") as typeof import("@google-cloud/secret-manager");
        this.client = new Client();
    }

    private project(): string {
        const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
        if (!project) throw new Error("GCLOUD_PROJECT is not set.");
        return project;
    }

    async create(secretId: string, value: string): Promise<string> {
        const [secret] = await this.client.createSecret({
            parent: `projects/${this.project()}`,
            secretId,
            secret: { replication: { automatic: {} }, labels: { app: "linkedloom", purpose: "byok" } },
        });
        if (!secret.name) throw new Error("Secret Manager did not return a secret name.");
        try {
            await this.client.addSecretVersion({ parent: secret.name, payload: { data: Buffer.from(value, "utf8") } });
        } catch (error) {
            // Don't leave an empty secret behind.
            await this.client.deleteSecret({ name: secret.name }).catch(() => undefined);
            throw error;
        }
        return secret.name;
    }

    async access(ref: string): Promise<string> {
        const hit = cached(ref);
        if (hit) return hit;
        const [version] = await this.client.accessSecretVersion({ name: `${ref}/versions/latest` });
        const value = version.payload?.data?.toString();
        if (!value) throw new Error("Secret has no value.");
        cache.set(ref, { value, expires: Date.now() + CACHE_TTL_MS });
        return value;
    }

    async destroy(ref: string): Promise<void> {
        cache.delete(ref);
        try {
            await this.client.deleteSecret({ name: ref });
        } catch (error: unknown) {
            // Already gone is fine (code 5 = NOT_FOUND).
            if ((error as { code?: number }).code !== 5) throw error;
        }
    }
}

/**
 * Emulator-only store so BYOK flows can be tested without a real GCP project.
 * Values live in `_emulatorSecrets`, which security rules deny to every client.
 */
class EmulatorSecretStore implements SecretStore {
    private col() {
        if (process.env.FUNCTIONS_EMULATOR !== "true") {
            throw new Error("EmulatorSecretStore must never be used outside the emulator.");
        }
        return getFirestore().collection("_emulatorSecrets");
    }

    async create(secretId: string, value: string): Promise<string> {
        await this.col().doc(secretId).set({ value });
        return `emulator/${secretId}`;
    }

    async access(ref: string): Promise<string> {
        const snap = await this.col().doc(ref.replace("emulator/", "")).get();
        const value = snap.data()?.value as string | undefined;
        if (!value) throw new Error("Secret has no value.");
        return value;
    }

    async destroy(ref: string): Promise<void> {
        await this.col().doc(ref.replace("emulator/", "")).delete();
    }
}

let store: SecretStore | undefined;

export function getSecretStore(): SecretStore {
    if (!store) store = process.env.FUNCTIONS_EMULATOR === "true" ? new EmulatorSecretStore() : new GcpSecretStore();
    return store;
}
