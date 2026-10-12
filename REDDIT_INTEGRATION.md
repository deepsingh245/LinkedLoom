# Reddit Integration – Exact Steps

> **Status check first:** Reddit is already ~90% implemented on `prod-v2` (commits `5345411`, `6af945d`).
> Steps 1–5 are what you must do to get it *working end-to-end*; Steps 6–8 close the gaps I found.
> The "File map" at the bottom shows how every piece fits, so you can rebuild it from scratch if needed.

Architecture (same pattern as LinkedIn): Next.js (client) → Firebase HTTPS Cloud Functions (`functions/src/reddit.ts`) → Reddit OAuth API. Tokens live in Firestore at `users/{uid}/connections/reddit`; `users/{uid}.reddit` holds the username (its presence = "connected").

---

## 1. Create the Reddit app

1. Log in to Reddit → https://www.reddit.com/prefs/apps → **create another app**.
2. Name: `LinkedLoom`. Type: **web app**.
3. Redirect URI (must match **exactly**, character for character):
   - Local: `http://localhost:3000/integrations/reddit/callback`
   - Prod: `https://<your-domain>/integrations/reddit/callback`
   (Reddit allows only one redirect URI per field but you can list several, one per line – add both.)
4. Copy the **client ID** (string under the app name) and the **secret**.

## 2. Configure backend env (`functions/.env`)

`functions/.env` currently has **no** `REDDIT_*` keys. Add:

```
REDDIT_CLIENT_ID=<client id>
REDDIT_CLIENT_SECRET=<secret>
REDDIT_REDIRECT_URI=http://localhost:3000/integrations/reddit/callback
REDDIT_USER_AGENT=web:linkedloom:1.0 (by /u/<your_reddit_username>)
```

For production, set `REDDIT_REDIRECT_URI` to the prod URL (use `functions/.env.<projectId>` or your normal deploy env mechanism). `getRedditConfig()` throws `failed-precondition` if any is missing.

## 3. Configure frontend env (`.env`)

`NEXT_PUBLIC_API_URL` must point at the functions base, because `lib/firebase/integrations.ts` calls `${NEXT_PUBLIC_API_URL}/getRedditAuthUrl` and `/exchangeRedditToken`. No new variable is needed.

## 4. Backend dependencies and deploy

```bash
cd functions
npm install            # axios + firebase-admin already used by linkedin.ts
npm run build
firebase deploy --only functions:getRedditAuthUrl,functions:exchangeRedditToken,functions:publishToReddit,functions:disconnectReddit,functions:getRedditAnalytics,functions:checkScheduledPosts,firestore:rules
```

`functions/src/index.ts` already has `export * from "./reddit";`. For local testing use `firebase emulators:start --only functions,firestore` and point `NEXT_PUBLIC_API_URL` at the emulator.

## 5. Test the connect flow

1. `npm run dev`, log in.
2. Go to **Settings → Profile → Reddit → Connect** (`app/(settings)/settings/profile/page.tsx`, `handleConnectReddit`).
3. It calls `getRedditAuthUrl` → redirects to Reddit → you click Allow → Reddit redirects to `/integrations/reddit/callback`.
4. `app/(dashboard)/integrations/reddit/callback/page.tsx` sends `code`, `state`, `redirectUri`, and the Firebase `idToken` to `exchangeRedditToken`.
5. Verify in Firestore: `users/{uid}.reddit = "<username>"` and `users/{uid}/connections/reddit` exists with `accessToken`, `refreshToken`, `expiresAt`.
6. The editor then shows the Reddit tab and the **Subreddit** field (driven by `profile.reddit`, `components/features/editor/post-editor/index.tsx:75`).

---

## 6. Reddit policy compliance (do this BEFORE step 1)

Reddit now gates API access behind its **Responsible Builder Policy** (https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) and its Public Content Policy. Creating an app at prefs/apps may not be enough: request/get API access approved first, with an honest use-case ("user-initiated tool; posts only to the user's own account/chosen subreddits; reads only the user's own posts; no scraping, no AI training"). I could not read the Responsible Builder page itself (403), so re-read it and confirm any extra requirements (e.g. developer profile / app label).

Already enforced in code (`functions/src/reddit.ts`):

| Rule | Implementation |
|---|---|
| Unique descriptive User-Agent | `REDDIT_USER_AGENT` env (default `web:linkedloom:1.0 (by /u/linkedloom)`) - **set it to your real Reddit username** |
| Respect rate limits | `redditRequest()` retries on 429 (Retry-After), slows down when `X-Ratelimit-Remaining` is low |
| No spam | per-user cap `REDDIT_MAX_POSTS_PER_DAY` (default 5/24h), `resubmit` removed, no auto cross-posting |
| Only user-initiated posting on user's own account | OAuth per user; user identity comes from the verified Firebase ID token, never from the request body |
| Don't keep deleted data / honour disconnect | `disconnectReddit` function revokes tokens at Reddit, deletes credentials, post log, clears profile field |
| Only own, non-removed posts in analytics | filter on `removed_by_category` / `[deleted]` |
| No private data / no AI training on Reddit data | the app never feeds Reddit content into Gemini; keep it that way |
| Tokens never exposed | `functions/firestore.rules` now denies all client access to `connections` (it used to be `allow read, write: if true` for everything) |

Still **manual** (can't be done in code):
- Get Reddit's approval and set `REDDIT_USER_AGENT` / `REDDIT_*` env vars.
- Add a privacy policy / terms page stating what Reddit data you store (username, tokens, post stats) and how users delete it (Disconnect button).
- Warn users that many subreddits ban AI-generated posts and require flair / karma.
- Optional: TTL policy on `oauthStates` (code now rejects states older than 10 min; stale docs remain).

## 7. What changed in code

- `functions/src/reddit.ts`: auth via ID token on all endpoints, JSON errors (no more `HttpsError` in `onRequest`), refreshed tokens persisted, daily cap, rate-limit retries, new `disconnectReddit` endpoint.
- `functions/src/scheduler.ts`: passes `userId` to `publishToRedditInternal`.
- `functions/firestore.rules`: locked down (users/posts owner-only; tokens backend-only).
- `lib/firebase/integrations.ts`: token exchange sends `Authorization: Bearer`; `disconnectReddit` calls the backend.
- `lib/firebase/posts.ts` + `use-posts.ts`: `publishPostNow` now supports Reddit (`options: { linkedin, reddit, subreddit }`). Nothing in the UI calls it yet - schedule flow already publishes to Reddit.

Deploy (note the new function and rules):

```bash
cd functions && npm run build
firebase deploy --only functions:disconnectReddit,functions:getRedditAuthUrl,functions:exchangeRedditToken,functions:publishToReddit,functions:getRedditAnalytics,functions:checkScheduledPosts,firestore:rules
```

If `getRedditAnalytics` / `publishToReddit` are called from the client, send `Authorization: Bearer <ID token>`.

---
## File map (what exists and where)

| Layer | File | Role |
|---|---|---|
| Backend | `functions/src/reddit.ts` | `getRedditAuthUrl`, `exchangeRedditToken`, `publishToRedditInternal`, `publishToReddit`, `getRedditAnalytics` |
| Backend | `functions/src/scheduler.ts` | `checkScheduledPosts` (every 10 min) publishes to LinkedIn **and** Reddit |
| Backend | `functions/src/index.ts` | exports `./reddit` |
| Client API | `lib/firebase/integrations.ts` | `getRedditAuthUrl`, `exchangeRedditToken`, `disconnectReddit` |
| Client API | `lib/api.ts` | exposes them as `api.firebaseService.*` |
| Hooks | `lib/query/hooks/use-integrations.ts` | `useDisconnectReddit` |
| Hooks | `lib/query/query-keys.ts` | `integrations.redditAuth` key |
| OAuth UI | `app/(dashboard)/integrations/reddit/callback/page.tsx` | handles redirect, exchanges code |
| Settings UI | `app/(settings)/settings/profile/page.tsx` | Connect / Disconnect button |
| Editor UI | `components/features/editor/post-editor/{index,PlatformTabs,PostSettings}.tsx` | Reddit tab + subreddit field |
| Schedule UI | `components/features/dashboard/SchedulePostDialog.tsx` | Reddit toggle |
| Preview | `components/features/editor/PostPreview.tsx` | Reddit-style preview |
| Types | `types/index.ts` | `Post.subreddit`, `UserProfile.reddit` |
| Icon | `components/shared/Icons.tsx` | `RedditIcon` |

## Adding another platform later (the recipe, using Reddit as the template)

1. Create the OAuth app; add env vars to `functions/.env`.
2. `functions/src/<platform>.ts`: `get<Platform>AuthUrl`, `exchange<Platform>Token`, `publishTo<Platform>Internal`, `publishTo<Platform>`; export from `index.ts`.
3. Store tokens in `users/{uid}/connections/<platform>` and a marker field on `users/{uid}`; add the field to `UserProfile` in `types/index.ts`.
4. Add client functions in `lib/firebase/integrations.ts` and wire into `lib/api.ts`.
5. Add callback page under `app/(dashboard)/integrations/<platform>/callback/`.
6. Add Connect/Disconnect UI in settings, a tab in `PlatformTabs`, a toggle in `SchedulePostDialog`.
7. Add a branch in `scheduler.ts` `publishPost` and in `publishPostNow`.
