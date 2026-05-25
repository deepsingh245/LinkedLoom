# LinkedLoom — System Architecture

## 1. System Architecture

LinkedLoom follows a **Serverless Architecture** on Google Firebase for scalability and low maintenance.

### High-Level Data Flow

```
Browser (Next.js 16)
    │
    ├── Firebase SDK (Auth / Firestore / Storage) ←→ Firestore DB
    │
    └── fetch() / httpsCallable()
            │
            ▼
    Firebase Cloud Functions v2 (Node 22)
            │
            ├── LinkedIn API (OAuth, UGC Posts, Analytics)
            ├── Reddit API (OAuth, Submit, User posts)
            └── Google Gemini / Vertex AI (text + image generation)
```

### Services & Responsibilities

| Service | Platform | Role |
|---|---|---|
| Frontend | Vercel / Next.js 16 | UI, auth state, direct Firestore subscriptions |
| Backend Logic | Firebase Cloud Functions v2 | OAuth exchanges, AI calls, image resizing, scheduled publishing |
| Database | Firebase Firestore | Users, posts, connections, analytics cache |
| File Storage | Firebase Storage | Post images, profile photos; triggers image resizing function |
| Authentication | Firebase Auth | Email/password, Google OAuth, LinkedIn custom-token login |
| AI Engine | Google Gemini + Vertex AI | Text generation (`gemini-2.5-flash-lite`), image generation (Vertex AI) |

---

## 2. Database Design (Firestore)

### `/users/{userId}`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Same as doc ID |
| `email` | string | |
| `displayName` | string | |
| `photoURL` | string | nullable |
| `jobTitle` | string | nullable |
| `company` | string | nullable |
| `location` | string | nullable |
| `bio` | string | nullable |
| `linkedin` | string | Set to LinkedIn display name when connected; presence = connected |
| `reddit` | string | Set to Reddit username when connected; presence = connected |
| `twitter` / `x` | string | nullable |
| `preferences` | object | `UserPreferences` (theme, AI defaults, notifications) |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `/users/{userId}/connections/linkedin`

| Field | Type | Notes |
|---|---|---|
| `provider` | string | `"linkedin"` |
| `providerUserId` | string | LinkedIn `sub` claim |
| `accessToken` | string | Stored plaintext — encrypt before production |
| `refreshToken` | string | nullable |
| `expiresAt` | Date | |
| `name` | string | |
| `email` | string | |
| `picture` | string | |
| `createdAt` / `updatedAt` | timestamp | |

### `/users/{userId}/connections/reddit`

| Field | Type | Notes |
|---|---|---|
| `provider` | string | `"reddit"` |
| `providerUserId` | string | Reddit user ID (`t2_xxxxx`) |
| `accessToken` | string | Short-lived (~1 hour) |
| `refreshToken` | string | Long-lived (permanent scope) |
| `expiresAt` | Date | Access token expiry; auto-refreshed on publish |
| `name` | string | Reddit username (no `u/` prefix) |
| `iconImg` | string | Profile image URL |
| `createdAt` / `updatedAt` | timestamp | |

### `/posts/{postId}`

| Field | Type | Notes |
|---|---|---|
| `user_id` | string | **Indexed** |
| `content` | string | Post body text |
| `status` | string | `"DRAFT"` / `"SCHEDULED"` / `"PUBLISHED"` / `"FAILED"` |
| `tone` | string | `"PROFESSIONAL"`, `"CASUAL"`, etc. |
| `topic` | string | nullable |
| `imageUrl` | string | nullable — Firebase Storage download URL |
| `mediaUrls` | string[] | Array version of imageUrl |
| `articleUrl` | string | nullable |
| `linkedinUrn` | string | LinkedIn post URN after publishing |
| `subreddit` | string | nullable — target subreddit (e.g. `entrepreneurship`); omits `r/` prefix; defaults to `u_<username>` |
| `scheduledFor` | timestamp | **Indexed** — when to auto-publish |
| `publishedAt` | timestamp | nullable |
| `createdAt` / `updatedAt` | timestamp | |

### `/analytics/{userId}/dashboard/data`

Cached dashboard aggregate. Shape matches `DashboardData` interface. Merged from LinkedIn + Reddit analytics.

### `/oauthStates/{stateId}`

CSRF tokens for OAuth flows. Created on auth URL generation, deleted on code exchange (one-time use).
No TTL — stale entries accumulate if user abandons the flow (known issue).

---

## 3. Cloud Functions

All functions live in `functions/src/`. Entry point: `functions/src/index.ts`.

### AI Functions (`ai.ts`) — `onCall` (require Firebase Auth token)

| Function | Input | Output |
|---|---|---|
| `generatePost` | `{ topic, tone, length, excludeIcons, creativeExpansion }` | `{ content: string }` |
| `generateImage` | `{ prompt, referenceImage? }` | `{ imageUrl: string }` (base64 data URI) |
| `enhanceImagePrompt` | `{ prompt }` | `{ enhancedPrompt: string }` |

### LinkedIn Functions (`linkedin.ts`) — `onRequest` HTTP endpoints

| Function | Auth | Notes |
|---|---|---|
| `getLinkedInAuthUrl` | None | Generates CSRF state, returns OAuth URL |
| `exchangeLinkedInToken` | State param | Exchanges code → tokens; creates Firebase custom token for login |
| `publishToLinkedIn` | None (trusts userId ⚠️) | Posts UGC content to LinkedIn API |
| `getLinkedInAnalytics` | None (trusts userId ⚠️) | Fetches post stats; falls back to local DB |

### Reddit Functions (`reddit.ts`) — `onRequest` HTTP endpoints

| Function | Auth | Notes |
|---|---|---|
| `getRedditAuthUrl` | None | Generates CSRF state, returns OAuth URL |
| `exchangeRedditToken` | Firebase ID token (in body) | Verifies current user; stores Reddit connection under their UID — no custom token needed |
| `publishToReddit` | None (trusts userId ⚠️) | Submits post via Reddit `/api/submit`; auto-refreshes expired access tokens |
| `getRedditAnalytics` | None (trusts userId ⚠️) | Fetches recent submissions; aggregates score + comments |

### Scheduler (`scheduler.ts`) — `onSchedule("every 10 minutes")`

1. Queries `posts` where `status == "SCHEDULED"` AND `scheduledFor <= now`
2. For each due post, attempts publish to every connected platform:
   - Checks `users/{uid}/connections/linkedin` → calls `publishToLinkedInInternal` if present
   - Checks `users/{uid}/connections/reddit` → calls `publishToRedditInternal` if present (uses `post.subreddit` if set, else `u_<username>`)
3. Updates post to `PUBLISHED` on success, `FAILED` only if all platforms fail

### Image Resizing (`images.ts`) — `onObjectFinalized` Storage trigger

Generates WebP variants (200×200, 400×400, 800×800) for any image uploaded to `/attachments/`. Output at `resized/{dir}/{filename}_{size}.webp`. Used by `<SmartImage />` for progressive loading.

---

## 4. OAuth Flows

### LinkedIn (supports both login + connect-from-settings)

```
getLinkedInAuthUrl → LinkedIn authorization → /integrations/linkedin/callback
    → exchangeLinkedInToken → signInWithCustomToken (re-auth as same UID)
```

LinkedIn emails are used to match/create Firebase users, so this works for new sign-ups too.

### Reddit (connect-from-settings only — user must be logged in)

```
getRedditAuthUrl → Reddit authorization → /integrations/reddit/callback
    → auth.currentUser.getIdToken() → exchangeRedditToken(code, state, redirectUri, idToken)
    → backend verifies ID token → stores connection under existing UID
```

Reddit does not expose email, so the approach differs: the frontend passes a Firebase ID token to prove which account to attach the Reddit connection to. No re-authentication is needed.

---

## 5. Frontend Architecture

### Route Groups

| Group | Layout | Auth |
|---|---|---|
| `(auth)` | Minimal — no shell | Public |
| `(dashboard)` | `AuthProvider > DataProvider > Shell + Sidebar` | Protected (client-side) |
| `(settings)` | `AuthProvider > SettingsLayout + SettingsSidebar` | Protected (client-side) |

**Note:** Auth protection is client-side only via `AuthProvider`. No `middleware.ts` exists — there is no server-side route guard.

### State Management

- **`AuthProvider`**: Listens to `onAuthStateChanged`; subscribes to `users/{uid}` via `onSnapshot` for real-time profile updates. Exposes `{ user, profile, loading }`.
- **`DataProvider`**: Re-fetches all posts + dashboard data on every route change. Exposes `{ posts, scheduledPosts, draftPosts, dashboardData, loading, syncing, refreshData }`.
- No global state library — Context API only.

### Platform Tabs & Preview

The post editor supports multiple platforms. `connectedPlatforms` is derived from the user's `profile` (which fields are truthy):
```typescript
if (profile?.linkedin) list.push("linkedin");
if (profile?.twitter || profile?.x) list.push("x");
if (profile?.reddit) list.push("reddit");
```

`PlatformTabs` renders a tab per connected platform. `PostPreview` renders the matching platform preview component (`LinkedInPreview`, `XPreview`, `RedditPreview`).

---

## 6. Known Production Issues

| ID | Severity | Issue |
|---|---|---|
| KI-1 | Critical | Firestore rules are `allow read, write: if true` — publicly accessible |
| KI-2 | Critical | LinkedIn CORS hardcoded to `http://localhost:3000` |
| KI-3 | Critical | `publishToLinkedIn` / `publishToReddit` trust `userId` from request body without ID token verification |
| KI-4 | Critical | Raw Firebase error codes shown to users on login |
| KI-5 | Critical | No `middleware.ts` — no server-side route protection |
| KI-7 | High | No rate limiting on AI generation endpoints |
| KI-8 | High | No `maxInstances` on Cloud Functions — unbounded scaling |
| KI-9 | High | No security headers in `next.config.ts` |
| KI-10 | High | No `limit()` on Firestore queries — all posts fetched at once |
| KI-16 | Medium | LinkedIn tokens expire after ~60 days — no refresh logic |

---

*Last updated: 2026-05-25*
