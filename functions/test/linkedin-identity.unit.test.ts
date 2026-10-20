// Which account does a LinkedIn sign-in belong to? (pure decision logic)
import { describe, expect, it } from "vitest";
import { decideLinkedInAccount, profileFieldsForLinkedIn } from "../src/linkedin-identity";

describe("decideLinkedInAccount – connect (user was logged in)", () => {
    it("always attaches to the logged-in account, whatever the LinkedIn email is", () => {
        expect(decideLinkedInAccount({ mode: "connect", stateUid: "u1", email: "work@corp.com", emailVerified: true })).toEqual({ action: "connect", uid: "u1" });
        // Even an unverified or missing LinkedIn email can't stop the logged-in user from connecting.
        expect(decideLinkedInAccount({ mode: "connect", stateUid: "u1", emailVerified: false })).toEqual({ action: "connect", uid: "u1" });
    });

    it("never switches to another account that happens to share the email", () => {
        const d = decideLinkedInAccount({ mode: "connect", stateUid: "u1", email: "me@x.com", emailVerified: true, emailUser: { uid: "other", emailVerified: true } });
        expect(d).toEqual({ action: "connect", uid: "u1" });
    });

    it("re-connecting the same LinkedIn profile is fine", () => {
        expect(decideLinkedInAccount({ mode: "connect", stateUid: "u1", identityUid: "u1", emailVerified: true })).toEqual({ action: "connect", uid: "u1" });
    });

    it("refuses a LinkedIn profile that already belongs to a different account", () => {
        const d = decideLinkedInAccount({ mode: "connect", stateUid: "u1", identityUid: "u2", emailVerified: true });
        expect(d).toMatchObject({ action: "reject", status: 409 });
    });

    it("refuses a connect request that lost its account", () => {
        expect(decideLinkedInAccount({ mode: "connect", emailVerified: true })).toMatchObject({ action: "reject", status: 400 });
    });
});

describe("decideLinkedInAccount – login", () => {
    it("a linked LinkedIn profile signs into its account, even if the email changed", () => {
        expect(decideLinkedInAccount({ mode: "login", identityUid: "u1", email: "new@x.com", emailVerified: true })).toEqual({ action: "login", uid: "u1", via: "identity" });
    });

    it("a verified LinkedIn email matches an existing verified account", () => {
        expect(decideLinkedInAccount({ mode: "login", email: "me@x.com", emailVerified: true, emailUser: { uid: "u1", emailVerified: true } })).toEqual({ action: "login", uid: "u1", via: "email" });
    });

    it("creates an account only when there is none", () => {
        expect(decideLinkedInAccount({ mode: "login", email: "new@x.com", emailVerified: true })).toEqual({ action: "create" });
    });

    it("never trusts an email LinkedIn hasn't verified, or a missing one", () => {
        expect(decideLinkedInAccount({ mode: "login", email: "me@x.com", emailVerified: false, emailUser: { uid: "u1", emailVerified: true } })).toMatchObject({ action: "reject", status: 400 });
        expect(decideLinkedInAccount({ mode: "login", emailVerified: true })).toMatchObject({ action: "reject", status: 400 });
    });

    it("won't sign into an account whose own email is unverified (pre-registration takeover)", () => {
        const d = decideLinkedInAccount({ mode: "login", email: "me@x.com", emailVerified: true, emailUser: { uid: "u1", emailVerified: false } });
        expect(d).toMatchObject({ action: "reject", status: 409 });
        expect((d as { message: string }).message).toMatch(/Settings/);
    });

    it("won't sign into an account that is connected to a different LinkedIn profile", () => {
        const d = decideLinkedInAccount({ mode: "login", email: "me@x.com", emailVerified: true, emailUser: { uid: "u1", emailVerified: true, linkedinSub: "someone-else" } });
        expect(d).toMatchObject({ action: "reject", status: 409 });
    });
});

describe("profileFieldsForLinkedIn", () => {
    const li = { name: "Li Name", picture: "https://img/li.png", email: "li@x.com" };

    it("fills a brand-new profile", () => {
        expect(profileFieldsForLinkedIn(undefined, li)).toEqual({ linkedin: "Li Name", displayName: "Li Name", photoURL: "https://img/li.png", email: "li@x.com" });
    });

    it("never overwrites the user's own name, photo or email", () => {
        expect(profileFieldsForLinkedIn({ displayName: "My Name", photoURL: "https://img/me.png", email: "me@x.com" }, li)).toEqual({ linkedin: "Li Name" });
    });

    it("fills only what is missing", () => {
        expect(profileFieldsForLinkedIn({ displayName: "My Name" }, li)).toEqual({ linkedin: "Li Name", photoURL: "https://img/li.png", email: "li@x.com" });
    });
});
