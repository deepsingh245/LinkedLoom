# Preferences audit

Page: `app/(settings)/settings/preferences/page.tsx` · Data: `profile.preferences` (`UserPreferences` in `types/index.ts`, stored on `users/{uid}`) · Defaults/merge: `lib/preferences.ts`.

Audit date: 2026-10-20. Before this audit **only Theme did anything**; every other control was a disabled stub (greyed out, no code reading the value). Status below is after the fixes made in the same change.

## Summary

| Setting | Status now | Notes |
|---|---|---|
| Theme | ✅ Works | Applied by `Shell.tsx` (`setTheme`) and the header toggle; saved to the profile. |
| Animations & transitions | ✅ **Fixed** | Was a disabled switch. Now sets `data-motion="reduced"` on `<html>` (`applyDisplayPreferences`, called from `Shell.tsx`) and `globals.css` removes animations/transitions. |
| Default tone | ✅ **Fixed** | Content Studio starts with this tone (applied once when the profile loads; later choices in the editor are respected). |
| Content language | ✅ **Fixed** | Sent to `generatePost`, which now prompts "Write the post in <language>". Server validates it as a short plain word (no prompt injection). Options are still English/Spanish/French/German only. |
| Auto-add hashtags | ✅ **Fixed** | Sent to `generatePost`; off → the prompt says "Do NOT add hashtags" instead of requiring 3–5. |
| Density (comfortable/compact) | ⏳ Not implemented | Control is disabled and labelled "Coming soon". Needs layout work (spacing tokens), not a quick fix. |
| Smart suggestions | ⏳ Not implemented | No dashboard feature exists that shows AI topic ideas. Labelled "coming soon". |
| Notifications (6 toggles) | ⏳ Not implemented | No email/push/in-app notification system exists, nothing reads these. Card labelled "Coming soon". Needs a sender (e.g. Cloud Functions + email provider) before it is meaningful. `postPublished` is the most natural first one now that the publisher records outcomes. |
| Two-factor authentication | ⏳ Not implemented | Firebase Auth supports MFA, but it needs enrolment UI and re-auth flows. The chip used to say "Disabled" (looked like a real, off setting); it now says "Not available yet". |

## Fixed in this change

1. **Partial saves.** `handleUpdate` copied `profile.preferences || {}` and set one key, so a user who had only ever saved the theme got a document with only that key, and the page then showed toggles like "Post published" as off (`!!undefined`). It now merges onto defaults first (`mergePreferences`). `Shell.tsx` reuses the same helper instead of a 25-line copy of the defaults.
2. **Silent stubs.** Disabled controls looked identical to broken ones. Notifications and Privacy now carry a "Coming soon" badge; Density and Smart suggestions say so too.
3. **Misleading 2FA state** (above).
4. **Live controls:** animations, default tone, language, auto-hashtags (above).
5. **Removed irrelevant settings:** "Public profile" (no public profile page exists) and "Analytics sharing" (no sharing pipeline) are gone from the page, the defaults and `UserPreferences`. Old saved values on user documents are simply ignored.

## Still open / suggestions (small to medium)

- **Persona defaults:** a new Autopilot persona could prefill its language/tone from these preferences (persona tones are `professional | casual | technical`, preference tones are `professional | casual | viral | storytelling`, so the lists need mapping first).
- **Language list:** only four languages; the persona form accepts any language string. Consider a shared list or free text.
- **Density:** one CSS variable for page padding/gaps plus `data-density` on `<html>` would be enough for a first version.
- **Notifications:** start with a single "Post published / failed" email using the publisher's results; hide the rest until they exist.
- **Firestore rules:** `users/{uid}` is owner read/write, so a client can write any `preferences` shape. Harmless today, but if preferences ever gate server behaviour, validate them in rules or a callable.
- **Saving UX:** every toggle writes immediately and toasts "Preferences updated." Fine for switches; rapid changes can race (last write wins because the whole object is rewritten). Writing only the changed key (`updateDoc(..., { "preferences.ai.language": value })`) would avoid that.
