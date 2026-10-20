// LinkedIn sign-in and connect through the real emulators, with a fake LinkedIn (token + userinfo) on a fixed
// local port (LINKEDIN_OAUTH_BASE / LINKEDIN_API_BASE in .env.demo-linkedloom-test; honoured only in the emulator).
// Covers: one account per person (same email, different email, logged-in connect), no overwriting of the
// profile, refused takeovers, one-time/expiring OAuth state.
import { randomUUID } from "crypto";
import * as http from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithCustomToken, type Auth } from "firebase/auth";
import { getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-linkedloom-test";
const FUNCTIONS_URL = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1`;
const FAKE_LINKEDIN_PORT = 47891; // must match .env.demo-linkedloom-test
const adminDb = () => getAdminFirestore();

interface FakeProfile {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
}
const profiles = new Map<string, FakeProfile>(); // code → profile
let server: http.Server;

beforeAll(async () => {
    if (!getAdminApps().length) initAdmin({ projectId: PROJECT_ID });
    server = http.createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
            if (req.url?.startsWith("/oauth/v2/accessToken") && req.method === "POST") {
                const code = new URLSearchParams(Buffer.concat(chunks).toString()).get("code") ?? "";
                if (!profiles.has(code)) {
                    res.writeHead(400, { "content-type": "application/json" });
                    return res.end(JSON.stringify({ error: "invalid_grant" }));
                }
                res.writeHead(200, { "content-type": "application/json" });
                return res.end(JSON.stringify({ access_token: `tok_${code}`, expires_in: 5_184_000, refresh_token: null }));
            }
            if (req.url?.startsWith("/v2/userinfo")) {
                const code = (req.headers.authorization ?? "").replace("Bearer tok_", "");
                const profile = profiles.get(code);
                res.writeHead(profile ? 200 : 401, { "content-type": "application/json" });
                return res.end(JSON.stringify(profile ?? {}));
            }
            res.writeHead(404);
            res.end();
        });
    });
    await new Promise<void>((resolve) => server.listen(FAKE_LINKEDIN_PORT, "127.0.0.1", resolve));
}, 30_000);

const apps: FirebaseApp[] = [];
afterAll(async () => {
    await Promise.all(apps.map((a) => deleteApp(a).catch(() => undefined)));
    server?.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function appUser(name: string) {
    const app = initializeApp({ projectId: PROJECT_ID, apiKey: "fake-api-key" }, `${name}-${Date.now()}-${Math.random()}`);
    apps.push(app);
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    return { app, auth };
}

/** A logged-in browser user (e.g. "signed in with Google"): returns the uid and a fresh ID token. */
async function loggedInUser(email: string) {
    const { auth } = await appUser("li");
    const cred = await createUserWithEmailAndPassword(auth, email, "password123");
    return { uid: cred.user.uid, idToken: await cred.user.getIdToken(), auth };
}

const uniqueEmail = (p: string) => `${p}-${randomUUID().slice(0, 8)}@test.dev`;

async function startOAuth(idToken?: string) {
    const res = await fetch(`${FUNCTIONS_URL}/getLinkedInAuthUrl`, { headers: idToken ? { Authorization: `Bearer ${idToken}` } : {} });
    return { status: res.status, body: (await res.json()) as { url?: string; state?: string; mode?: string; message?: string } };
}

async function exchange(state: string, code: string) {
    const res = await fetch(`${FUNCTIONS_URL}/exchangeLinkedInToken`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, state }),
    });
    return { status: res.status, body: (await res.json()) as { success?: boolean; mode?: string; customToken?: string; message?: string } };
}

/** Full round trip: start OAuth (optionally logged in), LinkedIn "returns" this profile, exchange. */
async function linkedin(profile: FakeProfile, opts: { idToken?: string } = {}) {
    const code = `code_${randomUUID().slice(0, 8)}`;
    profiles.set(code, profile);
    const started = await startOAuth(opts.idToken);
    expect(started.status).toBe(200);
    return exchange(started.body.state!, code);
}

async function uidFromToken(customToken: string) {
    const { auth } = await appUser("tok");
    return (await signInWithCustomToken(auth, customToken)).user.uid;
}

const authUserByEmail = async (email: string) => getAdminAuth().getUserByEmail(email).catch(() => null);
const connection = async (uid: string) => (await adminDb().doc(`users/${uid}/connections/linkedin`).get()).data();
const identity = async (sub: string) => (await adminDb().doc(`linkedinIdentities/${sub}`).get()).data();
const userDoc = async (uid: string) => (await adminDb().doc(`users/${uid}`).get()).data();

describe("login with LinkedIn", () => {
    it("creates one account for a new person and returns to the same account next time", async () => {
        const email = uniqueEmail("new");
        const sub = `sub_${randomUUID()}`;
        const first = await linkedin({ sub, email, email_verified: true, name: "New Person", picture: "https://img/new.png" });
        expect(first).toMatchObject({ status: 200, body: { success: true, mode: "login" } });
        const uid = await uidFromToken(first.body.customToken!);

        expect((await authUserByEmail(email))?.uid).toBe(uid);
        expect(await identity(sub)).toMatchObject({ uid });
        expect(await connection(uid)).toMatchObject({ providerUserId: sub, name: "New Person" });
        expect(await userDoc(uid)).toMatchObject({ uid, displayName: "New Person", linkedin: "New Person", email });

        // Logging in again (even if the LinkedIn email changed) lands in the same account.
        const again = await linkedin({ sub, email: uniqueEmail("changed"), email_verified: true, name: "New Person" });
        expect(await uidFromToken(again.body.customToken!)).toBe(uid);
    });

    it("uses the existing account when the verified email matches, and leaves the profile alone", async () => {
        const email = uniqueEmail("google");
        const existing = await getAdminAuth().createUser({ email, emailVerified: true, displayName: "Real Name" });
        await adminDb().doc(`users/${existing.uid}`).set({ uid: existing.uid, email, displayName: "Real Name", photoURL: "https://img/real.png" });

        const res = await linkedin({ sub: `sub_${randomUUID()}`, email, email_verified: true, name: "LinkedIn Name", picture: "https://img/li.png" });
        expect(res.status).toBe(200);
        expect(await uidFromToken(res.body.customToken!)).toBe(existing.uid);
        // Name and photo are the user's own; only the "linkedin" label is added.
        expect(await userDoc(existing.uid)).toMatchObject({ displayName: "Real Name", photoURL: "https://img/real.png", linkedin: "LinkedIn Name" });
    });

    it("won't sign into an account whose email was never verified", async () => {
        const email = uniqueEmail("unverified");
        const attacker = await getAdminAuth().createUser({ email, emailVerified: false, password: "attacker-knows-this" });
        const sub = `sub_${randomUUID()}`;
        const res = await linkedin({ sub, email, email_verified: true, name: "Victim" });
        expect(res.status).toBe(409);
        expect(res.body.customToken).toBeUndefined();
        expect(res.body.message).toMatch(/Settings/);
        expect(await identity(sub)).toBeUndefined();
        expect(await connection(attacker.uid)).toBeUndefined();
    });

    it("never trusts an email LinkedIn hasn't verified", async () => {
        const email = uniqueEmail("li-unverified");
        const existing = await getAdminAuth().createUser({ email, emailVerified: true });
        const res = await linkedin({ sub: `sub_${randomUUID()}`, email, email_verified: false, name: "Someone" });
        expect(res.status).toBe(400);
        expect(res.body.customToken).toBeUndefined();
        expect(await connection(existing.uid)).toBeUndefined();
    });
});

describe("connect LinkedIn while logged in", () => {
    it("attaches to the logged-in account even when the LinkedIn email is different – no second account, no switch", async () => {
        const gmail = uniqueEmail("gmail");
        const linkedinEmail = uniqueEmail("work");
        const me = await loggedInUser(gmail);
        const sub = `sub_${randomUUID()}`;

        const res = await linkedin({ sub, email: linkedinEmail, email_verified: true, name: "Work Me" }, { idToken: me.idToken });
        expect(res).toMatchObject({ status: 200, body: { success: true, mode: "connect" } });
        expect(res.body.customToken).toBeUndefined(); // the browser keeps its own session

        expect(await authUserByEmail(linkedinEmail)).toBeNull(); // no new account was created
        expect(await connection(me.uid)).toMatchObject({ providerUserId: sub, name: "Work Me" });
        expect(await identity(sub)).toMatchObject({ uid: me.uid });
        expect(await userDoc(me.uid)).toMatchObject({ linkedin: "Work Me" });

        // Later, "Login with LinkedIn" (logged out) is the same account – not a new one.
        const login = await linkedin({ sub, email: linkedinEmail, email_verified: true, name: "Work Me" });
        expect(login.body.mode).toBe("login");
        expect(await uidFromToken(login.body.customToken!)).toBe(me.uid);
    });

    it("refuses a LinkedIn profile that belongs to another account", async () => {
        const owner = await loggedInUser(uniqueEmail("owner"));
        const other = await loggedInUser(uniqueEmail("other"));
        const sub = `sub_${randomUUID()}`;
        expect((await linkedin({ sub, email: uniqueEmail("li"), email_verified: true, name: "Owner" }, { idToken: owner.idToken })).status).toBe(200);

        const res = await linkedin({ sub, email: uniqueEmail("li"), email_verified: true, name: "Owner" }, { idToken: other.idToken });
        expect(res.status).toBe(409);
        expect(await connection(other.uid)).toBeUndefined();
        expect(await identity(sub)).toMatchObject({ uid: owner.uid });
    });

    it("switching to a different LinkedIn profile releases the old one", async () => {
        const me = await loggedInUser(uniqueEmail("switch"));
        const subA = `sub_${randomUUID()}`;
        const subB = `sub_${randomUUID()}`;
        await linkedin({ sub: subA, email: uniqueEmail("a"), email_verified: true, name: "A" }, { idToken: me.idToken });
        await linkedin({ sub: subB, email: uniqueEmail("b"), email_verified: true, name: "B" }, { idToken: me.idToken });
        expect(await identity(subA)).toBeUndefined();
        expect(await identity(subB)).toMatchObject({ uid: me.uid });
        expect(await connection(me.uid)).toMatchObject({ providerUserId: subB });
    });

    it("rejects an invalid ID token instead of quietly starting a login", async () => {
        const res = await startOAuth("not-a-real-token");
        expect(res.status).toBe(401);
    });
});

describe("OAuth state", () => {
    it("can be used once", async () => {
        const code = `code_${randomUUID().slice(0, 8)}`;
        profiles.set(code, { sub: `sub_${randomUUID()}`, email: uniqueEmail("once"), email_verified: true, name: "Once" });
        const { body } = await startOAuth();
        expect((await exchange(body.state!, code)).status).toBe(200);
        expect((await exchange(body.state!, code)).status).toBe(403);
    });

    it("expires and rejects unknown values", async () => {
        const code = `code_${randomUUID().slice(0, 8)}`;
        profiles.set(code, { sub: `sub_${randomUUID()}`, email: uniqueEmail("late"), email_verified: true, name: "Late" });
        const { body } = await startOAuth();
        await adminDb().doc(`oauthStates/${body.state}`).update({ createdAtMs: Date.now() - 11 * 60_000 });
        expect((await exchange(body.state!, code)).status).toBe(403);
        expect((await exchange("made-up-state", code)).status).toBe(403);
        expect((await exchange("", code)).status).toBe(400);
    });

    it("reports a LinkedIn failure without leaking details", async () => {
        const { body } = await startOAuth();
        const res = await exchange(body.state!, "code-linkedin-rejects");
        expect(res.status).toBe(502);
        expect(res.body.message).not.toMatch(/invalid_grant/);
    });
});
