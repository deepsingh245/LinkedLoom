# 🚀 LinkedLoom — Production Readiness Checklist

> **Generated from a deep audit of the actual codebase.**
> Issues are marked with priority: 🔴 **Critical** · 🟠 **High** · 🟡 **Medium** · 🟢 **Low**

---

## Table of Contents

1. [🔴 Critical Blockers — Must Fix Before Launch](#-critical-blockers--must-fix-before-launch)
2. [🔐 Security & Authentication](#-security--authentication)
3. [🌐 API & Cloud Functions](#-api--cloud-functions)
4. [🗄️ Database & Storage](#-database--storage)
5. [🏗️ Frontend & Next.js](#-frontend--nextjs)
6. [🔑 Secrets & Environment Variables](#-secrets--environment-variables)
7. [📈 Performance & Scalability](#-performance--scalability)
8. [📊 Logging, Monitoring & Observability](#-logging-monitoring--observability)
9. [🔄 Deployment & CI/CD](#-deployment--cicd)
10. [📦 Dependencies & Packages](#-dependencies--packages)
11. [💾 Backup & Recovery](#-backup--recovery)
12. [✅ Final Pre-Deployment Checklist](#-final-pre-deployment-checklist)

---

## 🔴 Critical Blockers — Must Fix Before Launch

These issues will **break production or expose sensitive data**. Do not deploy without resolving them.

---

### 1. 🔴 Firestore Security Rules Are Wide Open

**File:** [`functions/firestore.rules`](./functions/firestore.rules)

**Current (DANGEROUS):**
```javascript
match /{document=**} {
  allow read, write: if true;  // ⚠️ ANY person on the internet can read/write everything
}
```

This means **anyone** can read access tokens, delete posts, or corrupt any user's data — without authentication. This is an OWASP A01 Broken Access Control vulnerability.

**Fix — replace with user-scoped rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Connections (e.g. LinkedIn tokens) — own user only
      match /connections/{connectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Posts — only the owning user
    match /posts/{postId} {
      allow read, write: if request.auth != null &&
                            resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null &&
                       request.resource.data.user_id == request.auth.uid;
    }

    // Analytics — own user only
    match /analytics/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // OAuth states — server-side only (deny all client access)
    match /oauthStates/{stateId} {
      allow read, write: if false;
    }
  }
}
```

---

### 2. 🔴 CORS Hardcoded to `localhost:3000` in Production Functions

**File:** [`functions/src/linkedin.ts`](./functions/src/linkedin.ts) — Lines 339, 400

```typescript
// publishToLinkedIn (line 339)
res.set('Access-Control-Allow-Origin', 'http://localhost:3000'); // ❌ Hardcoded!

// getLinkedInAnalytics (line 400)
res.set('Access-Control-Allow-Origin', 'http://localhost:3000'); // ❌ Hardcoded!
```

These functions also have `onRequest({ cors: true })` which will be **overridden** by the manual header. In production your domain will be blocked from calling these endpoints.

**Fix:**
```typescript
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';

// In each onRequest handler:
res.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
```

Then set `FRONTEND_URL=https://yourdomain.com` in your Firebase Functions environment:
```bash
firebase functions:secrets:set FRONTEND_URL
```

---

### 3. 🔴 No Next.js Route-Level Auth Middleware

**Finding:** There is **no `middleware.ts`** file at the project root. Dashboard routes are protected only by client-side `AuthProvider` which redirects after rendering — creating a window where unauthenticated users can see a flash of protected UI or directly hit API routes.

**Fix — create `middleware.ts` at root:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/create', '/schedule', '/analytics', '/calendar', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  
  // Check for Firebase session cookie (set after login)
  const session = request.cookies.get('session');
  
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/create', '/schedule/:path*', '/analytics', '/settings/:path*'],
};
```

---

### 4. 🔴 Raw Firebase Auth Error Messages Exposed to Users

**File:** [`app/(auth)/login/page.tsx`](./app/%28auth%29/login/page.tsx) — Line 65–66

```typescript
// ❌ Exposes internal Firebase error codes to the client (e.g. "auth/user-not-found")
dangerToast((err as Error).message || "Login failed");
setError((err as Error).message || "Login failed");
```

This reveals whether an email account exists, enabling user enumeration attacks (OWASP A07).

**Fix — map to generic messages:**
```typescript
const getAuthErrorMessage = (code: string): string => {
  const messages: Record<string, string> = {
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
  };
  return messages[code] || 'Login failed. Please try again.';
};

// In catch block:
const firebaseError = err as { code?: string };
dangerToast(getAuthErrorMessage(firebaseError.code || ''));
```

---

### 5. 🔴 Firebase Config `TODO` Comment Left in Production Code

**File:** [`lib/firebase.ts`](./lib/firebase.ts) — Line 7

```typescript
// TODO: Replace the following with your app's Firebase project configuration
```

Remove this comment before shipping. It signals the config is a placeholder and may confuse contributors or leak intent.

---

### 6. 🔴 Hardcoded GCP Project ID Fallback in AI Function

**File:** [`functions/src/ai.ts`](./functions/src/ai.ts) — Line 6

```typescript
const vertexAI = new VertexAI({
  project: process.env.PROJECT_ID || 'linkedloom', // ❌ Hardcoded fallback!
  location: 'us-central1'
});
```

If `PROJECT_ID` is not set, Vertex AI will attempt to use a project named `linkedloom` which may belong to a different Firebase project entirely. Remove the fallback and throw an error if the env var is missing.

**Fix:**
```typescript
const projectId = process.env.PROJECT_ID;
if (!projectId) throw new Error('PROJECT_ID environment variable is not set.');
const vertexAI = new VertexAI({ project: projectId, location: 'us-central1' });
```

---

## 🔐 Security & Authentication

### OAuth & Token Security

| Check | Status | Detail |
|---|---|---|
| LinkedIn OAuth CSRF state validated server-side | ✅ Done | `oauthStates` Firestore collection used |
| OAuth state validated **client-side** before redirect | ⚠️ Partial | `lib/firebase/auth.ts` generates its own untracked state (L75) — bypass risk |
| LinkedIn access tokens stored in Firestore subcollection | ✅ Done | `users/{uid}/connections/linkedin` |
| LinkedIn access token refresh logic | ❌ Missing | Tokens expire; no rotation or re-auth flow exists |
| OAuth state documents TTL/cleanup | 🟠 Risk | States are only deleted on use; stale entries accumulate in Firestore |

**Fix for stale OAuth states — add TTL check in `exchangeLinkedInToken`:**
```typescript
const stateDoc = await db.collection("oauthStates").doc(state).get();
const createdAt = stateDoc.data()?.createdAt;
const ageMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
if (!stateDoc.exists || ageMinutes > 10) {
  throw new HttpsError("permission-denied", "OAuth state expired or invalid.");
}
```

---

### Firebase Security

- [ ] 🔴 **Enable [Firebase App Check](https://firebase.google.com/docs/app-check)** — prevents unauthorized apps from using your Firebase project resources. Without it, anyone with your `NEXT_PUBLIC_FIREBASE_*` keys (which are public) can hit Firestore and Storage.
- [ ] 🟠 **Set Firebase Storage Security Rules** — currently no `storage.rules` file exists. Anyone authenticated can read/write any path.
- [ ] 🟠 **Enable email enumeration protection** in Firebase Auth console → Authentication → Settings → User Actions.
- [ ] 🟢 **Enable Firebase Auth MFA** option for admin/power users.

**Minimum Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024  // 5MB max
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

### Image Upload Validation

**File:** [`components/features/editor/post-editor/index.tsx`](./components/features/editor/post-editor/index.tsx) — Lines 172–177

Currently only validates on the **client side**. File type and size restrictions can be bypassed.

- [ ] 🟠 Validate file type and size in **Firebase Storage Rules** (shown above)
- [ ] 🟠 The Cloud Function `generateResizedImages` (`images.ts`) checks `contentType.startsWith("image/")` — this is good server-side validation, keep it

---

### Sensitive Data in `localStorage`

**Files:** `PostCard.tsx`, `post-editor/index.tsx`

```typescript
// ❌ Post content (including imageUrl with Firebase Storage tokens) stored unencrypted
localStorage.setItem("draft_post", JSON.stringify(post));
```

- [ ] 🟡 Ensure post data in localStorage never contains **OAuth tokens** or **user PII beyond the post content itself**
- [ ] 🟡 Clear localStorage on logout (currently `Sidebar.tsx` removes `token` and `user` keys, but not `draft_post`)

**Add to logout flow:**
```typescript
localStorage.removeItem('draft_post');
```

---

### Content Security Policy (CSP)

**File:** [`next.config.ts`](./next.config.ts) — Currently empty (`{}`)

No CSP headers are configured, leaving the app vulnerable to XSS injection of external scripts (OWASP A03).

**Fix — add to `next.config.ts`:**
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com",
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};
```

> **Note:** The login page loads a background SVG from `https://grainy-gradients.vercel.app/noise.svg` — add this domain to `img-src` or self-host the asset.

---

## 🌐 API & Cloud Functions

### Rate Limiting

- [ ] 🟠 **No rate limiting exists** on any Cloud Function. A single authenticated user can spam `generatePost`, `generateImage`, and `enhanceImagePrompt` indefinitely, running up Gemini/Vertex AI costs.

**Fix — add per-user rate limiting using Firestore:**
```typescript
async function checkRateLimit(uid: string, action: string, limitPerHour: number) {
  const ref = db.collection('rateLimits').doc(`${uid}_${action}`);
  const doc = await ref.get();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  if (doc.exists) {
    const { count, windowStart } = doc.data()!;
    if (now - windowStart < windowMs && count >= limitPerHour) {
      throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Try again later.');
    }
    if (now - windowStart >= windowMs) {
      await ref.set({ count: 1, windowStart: now });
    } else {
      await ref.update({ count: count + 1 });
    }
  } else {
    await ref.set({ count: 1, windowStart: now });
  }
}
```

### Cloud Function Scaling Limits

- [ ] 🟠 **No `maxInstances`** configured on any Cloud Function. Under traffic spikes (or a DDoS), functions scale without bound, generating unlimited Firebase/GCP costs.

**Fix — add instance limits:**
```typescript
export const generatePost = onCall({ maxInstances: 10 }, async (request) => { ... });
export const generateImage = onCall({ maxInstances: 5 }, async (request) => { ... });
export const generateResizedImages = onObjectFinalized({ cpu: 2, memory: '1GiB', maxInstances: 20 }, ...);
```

### `publishToLinkedIn` Authentication Gap

**File:** [`functions/src/linkedin.ts`](./functions/src/linkedin.ts) — Line 348

```typescript
const { userId, content, articleUrl, imageUrl } = req.body;
```

This HTTP endpoint **trusts the `userId` from the request body** without verifying the caller is that user. Anyone who discovers this Cloud Function URL can publish to **any user's** LinkedIn account.

- [ ] 🔴 **Add Firebase Auth token verification** to all HTTP endpoints (not just `onCall` functions):

```typescript
import { getAuth } from 'firebase-admin/auth';

// In publishToLinkedIn handler:
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  res.status(401).json({ error: 'Unauthorized' });
  return;
}
const idToken = authHeader.split('Bearer ')[1];
const decoded = await getAuth().verifyIdToken(idToken);
if (decoded.uid !== userId) {
  res.status(403).json({ error: 'Forbidden' });
  return;
}
```

And update the client call in `lib/firebase/posts.ts` to pass the ID token:
```typescript
const idToken = await auth.currentUser?.getIdToken();
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/publishToLinkedIn`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  },
  body: JSON.stringify({ userId, content, articleUrl, imageUrl }),
});
```

### Internal Error Details Leaking to Clients

**File:** [`functions/src/linkedin.ts`](./functions/src/linkedin.ts) — Lines 209, 391, 516

```typescript
// ❌ Raw internal error details sent to client
throw new HttpsError("internal", "Failed to link LinkedIn account.", error.message);
throw new HttpsError("internal", "Failed to publish to LinkedIn.", error.response?.data?.message || error.message);
```

The third argument to `HttpsError` is sent to the client as `details`. This can expose stack traces, internal service error messages, or API secrets from third-party errors.

- [ ] 🟠 Remove the third argument from all `HttpsError` calls in production, or sanitize it first.

---

### Analytics Data Fabrication

**File:** [`functions/src/linkedin.ts`](./functions/src/linkedin.ts) — Lines 489–496

```typescript
// ⚠️ Chart data is calculated with made-up ratios when API is unavailable
chartData: [
  { name: "Mon", posts: Math.floor(totalPosts * 0.1), engagement: 0 },
  { name: "Tue", posts: Math.floor(totalPosts * 0.2), engagement: 0 },
  ...
```

This fabricated chart data is stored in Firestore and displayed on the dashboard, which could be misleading or violate data accuracy expectations of paying users.

- [ ] 🟡 Show clearly labelled "unavailable" state in the UI when real analytics cannot be fetched, instead of fabricating data.

---

## 🗄️ Database & Storage

### Firestore Query Limits (No Pagination)

**File:** [`lib/firebase/posts.ts`](./lib/firebase/posts.ts)

`getAllPosts()`, `getDraftPosts()`, and `getScheduledPosts()` fetch **all documents at once** with no `limit()`. A user with 1,000+ posts will trigger a massive read operation on every page navigation (data syncs on every route change via `data-provider.tsx`).

- [ ] 🟠 Add `limit()` to all list queries and implement cursor-based pagination
- [ ] 🟡 Add a `limit` of 50–100 documents per fetch as a minimum safeguard:

```typescript
import { limit, orderBy } from 'firebase/firestore';
const q = query(
  collection(db, Collections.POSTS),
  where('user_id', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(50)
);
```

### Firestore Indexes

- [ ] 🟡 The `scheduler.ts` function queries `where("status", "==", "SCHEDULED").where("scheduledFor", "<=", now)`. Verify a composite index on `(status, scheduledFor)` is deployed, or the query will fail at scale.

**Add to `firestore.indexes.json`:**
```json
{
  "collectionGroup": "posts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "scheduledFor", "order": "ASCENDING" }
  ]
}
```

### Data Type Consistency

- [ ] 🟡 Post `status` field is inconsistently cased — Firestore stores `"SCHEDULED"`, `"DRAFT"`, `"PUBLISHED"` (uppercase from Cloud Functions/scheduler) but the client sometimes filters for `"draft"`, `"scheduled"` (lowercase). Normalize to one case with a shared enum.

```typescript
// types/index.ts — add:
export enum PostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}
```

### `oAuthStates` Orphan Cleanup

- [ ] 🟡 OAuth state documents created in `getLinkedInAuthUrl` are deleted on use, but **never cleaned up if the user abandons the flow**. Over time this collection grows indefinitely.

**Fix — deploy a scheduled cleanup function:**
```typescript
export const cleanupOAuthStates = onSchedule("every 24 hours", async () => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
  const stale = await db.collection("oauthStates")
    .where("createdAt", "<", cutoff.toISOString()).get();
  const batch = db.batch();
  stale.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
});
```

---

## 🏗️ Frontend & Next.js

### Missing `.env.example` File

The [`README.md`](./README.md) references `.env.example` but the file **does not exist**. New contributors or deployment pipelines will have no reference for required variables.

- [ ] 🟠 Create `.env.example`:

```bash
# Firebase Client SDK (safe to expose — restricted by Firebase rules/App Check)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Cloud Functions base URL (production)
NEXT_PUBLIC_API_URL=https://us-central1-your_project.cloudfunctions.net

# LinkedIn OAuth (Client ID only — secret stays server-side)
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your_linkedin_client_id
NEXT_PUBLIC_LINKEDIN_REDIRECT_URI=https://yourdomain.com/linkedin/callback
```

```bash
# functions/.env (NEVER commit)
GEMINI_API_KEY=your_gemini_api_key
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=https://yourdomain.com/linkedin/callback
PROJECT_ID=your_gcp_project_id
FRONTEND_URL=https://yourdomain.com
```

### `support@undefined.firebaseapp.com` in Firebase Config

**File:** [`functions/firebase.json`](./functions/firebase.json) — Line 53

```json
"supportEmail": "support@undefined.firebaseapp.com"
```

This is a placeholder that was auto-generated and never updated. Firebase OAuth consent screens or error emails may display this broken address.

- [ ] 🟠 Update to a real support email address.

### No Global Error Boundary

- [ ] 🟡 Create `app/error.tsx` and `app/global-error.tsx` to catch unhandled React errors and show a friendly fallback instead of a blank white screen.

```typescript
// app/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Framer Motion Bundle Size

- [ ] 🟢 `framer-motion` (v12, ~80KB gzipped) is listed as a dependency. If it's only used for a few animations, consider replacing with CSS `@keyframes` or Tailwind's `animate-*` utilities to reduce bundle size.

---

## 🔑 Secrets & Environment Variables

### What Is and Is Not Safe to Expose

| Variable | `NEXT_PUBLIC_` | Safety |
|---|---|---|
| `FIREBASE_API_KEY` | ✅ Yes | Safe — locked down by Firebase rules & App Check |
| `FIREBASE_PROJECT_ID` | ✅ Yes | Safe — public identifier |
| `LINKEDIN_CLIENT_ID` | ✅ Yes | Safe — public OAuth client |
| `GEMINI_API_KEY` | ❌ Never | **Secret** — server-side only (functions env) |
| `LINKEDIN_CLIENT_SECRET` | ❌ Never | **Secret** — server-side only |
| `FIREBASE_ADMIN_SDK` | ❌ Never | **Secret** — never on client |

### Firebase Functions Secrets

Use Firebase Secret Manager (not `.env` files) for production secrets:

```bash
# Set secrets via CLI
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_REDIRECT_URI
firebase functions:secrets:set FRONTEND_URL

# Reference in function:
export const generatePost = onCall({ secrets: ["GEMINI_API_KEY"] }, async (req) => {
  const apiKey = process.env.GEMINI_API_KEY; // Injected at runtime
});
```

- [ ] 🔴 Never commit `.env`, `.env.local`, or `functions/.env` to git (currently ignored — verify with `git status`)
- [ ] 🟠 Rotate all secrets if any were ever accidentally committed to git history
- [ ] 🟡 Use `git log --all --full-history -- "*.env"` to verify no env files exist in history

---

## 📈 Performance & Scalability

### Data Fetching on Every Route Change

**File:** [`components/providers/data-provider.tsx`](./components/providers/data-provider.tsx) — Line 83

```typescript
useEffect(() => {
  if (user?.uid) {
    fetchData(true) // ← Triggers on every pathname change
  }
}, [user?.uid, pathname, fetchData])
```

This re-fetches all posts, scheduled posts, drafts, and analytics **on every navigation**. For a user with many posts, this creates unnecessary Firestore reads (which cost money on Blaze plan).

- [ ] 🟠 Implement proper **SWR** (`stale-while-revalidate`) caching or use TanStack Query, instead of refetching on every route change.
- [ ] 🟠 At minimum, add a **debounce/cooldown** (e.g. 30 seconds) so repeated navigation doesn't trigger redundant fetches.

### Image Variant Fetch on Every Card Mount

**File:** [`components/ui/smart-image.tsx`](./components/ui/smart-image.tsx)

The `variantCache` is an in-memory JS object that resets on every page navigation or React re-render tree. On pages with many `PostCard` components, this means repeated Firebase Storage `getDownloadURL` calls for the same images.

- [ ] 🟡 Persist variant URL cache to `sessionStorage` to survive SPA navigation:

```typescript
const CACHE_KEY = 'img_variant_cache';
const getCache = (): Record<string, ImageVariants> => {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
};
const setCache = (key: string, val: ImageVariants) => {
  const cache = getCache();
  cache[key] = val;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};
```

### Firebase `measurementId` / Analytics

- [ ] 🟢 If you are not using Firebase Analytics, remove `measurementId` from the config to avoid loading the analytics SDK unnecessarily.

---

## 📊 Logging, Monitoring & Observability

### Remove Sensitive Data from `console.log`

| File | Line | Issue |
|---|---|---|
| `lib/firebase/storage.ts` | 90 | Logs full Firebase Storage download URL |
| `functions/src/linkedin.ts` | 247 | Logs image URL being fetched |
| `functions/src/linkedin.ts` | 371 | Logs userId of person publishing |

- [ ] 🟠 Remove or redact PII/sensitive URLs from all log statements before production

### Recommended: Add Structured Logging

Cloud Functions' `console.log` outputs to Google Cloud Logging. Add structured log metadata for easier querying:

```typescript
// Replace:
console.log("Published post", doc.id);

// With:
console.log(JSON.stringify({ event: 'post_published', postId: doc.id, timestamp: new Date().toISOString() }));
```

### Recommended Monitoring Setup

- [ ] 🟠 **Firebase Alerts** — set budget alerts in Google Cloud Billing (especially important for Vertex AI / Gemini calls)
- [ ] 🟡 **Firebase Crashlytics** — add to catch unhandled client-side errors
- [ ] 🟡 **Google Cloud Monitoring** — set up uptime checks on your domain and Cloud Function error rate alerts
- [ ] 🟢 **Sentry** or **LogRocket** — add frontend error tracking with `dsn` set from env var (never hardcoded)

---

## 🔄 Deployment & CI/CD

### No CI/CD Pipeline

- [ ] 🟠 No CI/CD configuration files were found (no `.github/workflows/`, no `Dockerfile`, no `vercel.json`). Manual deployments are error-prone.

**Recommended — GitHub Actions workflow for Next.js (Vercel) + Firebase Functions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '22' }
      - run: npm ci
        working-directory: ./functions
      - run: npm run build
        working-directory: ./functions
      - uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions,firestore:rules,firestore:indexes
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          # ... other NEXT_PUBLIC vars
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Pre-Deployment Checks

- [ ] 🟠 Run `npm audit` and `npm audit --prefix functions` — fix any **critical** or **high** vulnerabilities before deployment
- [ ] 🟠 Run `npm run lint` — ensure no ESLint errors ship to production
- [ ] 🟠 Run `npm run build` — ensure production build succeeds cleanly
- [ ] 🟠 Deploy Firestore rules and indexes **before** deploying new Cloud Functions that depend on them

### Deployment Order

Always deploy in this order to avoid service disruptions:
1. Firestore security rules (`firebase deploy --only firestore:rules`)
2. Firestore indexes (`firebase deploy --only firestore:indexes`)
3. Firebase Cloud Functions (`firebase deploy --only functions`)
4. Next.js frontend (Vercel / other host)

---

## 📦 Dependencies & Packages

### Dependency Audit Results to Verify

```bash
# Run before deployment:
npm audit
npm audit --prefix functions

# Fix automatically where safe:
npm audit fix
npm audit fix --prefix functions
```

### Notable Version Observations

| Package | Current | Note |
|---|---|---|
| `next` | `16.0.10` | Verify this is the latest stable — check [nextjs.org](https://nextjs.org) |
| `firebase` | `^10.8.0` | Firebase JS SDK v11 is available — test upgrade |
| `firebase-admin` | `^11.10.0 \|\| ^12.0.0` | Loose range — pin to `^12.0.0` for consistency |
| `@google/generative-ai` | `^0.1.3` | Very old version (0.1.x) — Gemini SDK is now at 0.24+, `^0.1.3` may miss security patches |
| `axios` | `^1.13.x` | Keep updated — had SSRF-related CVEs in older versions |
| `sharp` | `^0.34.5` | Good; uses libvips — keep updated for image processing CVEs |

- [ ] 🟠 Pin the `@google/generative-ai` SDK to `^0.21.0` or later to get the latest Gemini API features and fixes
- [ ] 🟡 Pin all dependency versions (replace `^` with exact versions) in `functions/package.json` for reproducible Cloud Function builds

---

## 💾 Backup & Recovery

- [ ] 🟠 **Enable Firestore automated backups** in the Google Cloud Console (Cloud Firestore → Backups). The default retention is 7 days.
- [ ] 🟠 **Document restore procedure** — know how to restore from backup before you need to
- [ ] 🟡 **Export Firestore data** to GCS before each major deployment:
  ```bash
  gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)
  ```
- [ ] 🟡 **Firebase Storage is not automatically backed up** — consider enabling GCS versioning on your storage bucket

---

## ✅ Final Pre-Deployment Checklist

Copy this section and check off each item before going live.

### 🔴 Critical (Launch Blockers)

- [ ] Firestore security rules updated — no `allow read, write: if true`
- [ ] Firebase Storage security rules created and deployed
- [ ] CORS `Access-Control-Allow-Origin` updated from `http://localhost:3000` to production domain
- [ ] `publishToLinkedIn` and `getLinkedInAnalytics` HTTP endpoints verify Firebase ID token (not just trusted userId from body)
- [ ] Login error messages use generic text, not raw Firebase error codes
- [ ] Firebase TODO comment removed from `lib/firebase.ts`
- [ ] Hardcoded `'linkedloom'` project ID fallback removed from `ai.ts`
- [ ] All secrets are in Firebase Secret Manager (not `.env` files committed to git)
- [ ] Verified no `.env` files in git history: `git log --all --full-history -- "*.env"`
- [ ] `npm run build` passes without errors or warnings

### 🟠 High Priority (Ship Soon After Launch)

- [ ] `middleware.ts` added for server-side route protection
- [ ] Firebase App Check enabled and enforced
- [ ] Rate limiting added to `generatePost`, `generateImage`, `enhanceImagePrompt`
- [ ] `maxInstances` set on all Cloud Functions
- [ ] `.env.example` file created in root
- [ ] `support@undefined.firebaseapp.com` updated to a real email
- [ ] `npm audit` passes with no critical/high vulnerabilities
- [ ] `npm audit --prefix functions` passes with no critical/high vulnerabilities
- [ ] HTTP security headers configured in `next.config.ts` (X-Frame-Options, CSP, etc.)
- [ ] Firebase Billing budget alerts configured
- [ ] Firestore automated backups enabled

### 🟡 Medium Priority (Next Sprint)

- [ ] Composite Firestore index added for `(status, scheduledFor)` scheduler query
- [ ] `oauthStates` TTL validation (10 min max) + cleanup scheduled function
- [ ] Post status enum created and used consistently (DRAFT/SCHEDULED/PUBLISHED uppercase only)
- [ ] `limit()` added to all Firestore list queries
- [ ] `SmartImage` variant cache persisted to `sessionStorage`
- [ ] LinkedIn access token refresh flow implemented
- [ ] Analytics data labeled as "unavailable" instead of fabricated when LinkedIn API blocks access
- [ ] `localStorage.removeItem('draft_post')` added to logout flow
- [ ] Raw error `details` removed from Cloud Function `HttpsError` third argument
- [ ] `app/error.tsx` and `app/global-error.tsx` created
- [ ] CI/CD pipeline configured (GitHub Actions recommended)
- [ ] `@google/generative-ai` upgraded to `^0.21.0` or later

### 🟢 Low Priority (Nice to Have)

- [ ] Data fetching debounced/cached (replace route-change refetch with SWR or TanStack Query)
- [ ] Evaluate removing `framer-motion` for bundle size reduction
- [ ] Pin exact dependency versions in `functions/package.json`
- [ ] Structured JSON logging in Cloud Functions
- [ ] Frontend error monitoring (Sentry or LogRocket) integrated
- [ ] `firebase deploy --only` commands broken out and verified individually

---

## 🔍 Hidden Production Risks Summary

These risks were identified from the codebase and may not be obvious until they cause incidents:

| Risk | Impact | Likelihood |
|---|---|---|
| Open Firestore rules | Anyone reads/writes user data | 🔴 Certain if discovered |
| CORS locked to localhost | LinkedIn publish fails in prod | 🔴 Certain on first deploy |
| No auth on HTTP functions | Cross-user LinkedIn publishing | 🟠 High if URLs are known |
| No rate limiting on AI endpoints | Runaway Gemini/Vertex AI costs | 🟠 High under load |
| No `maxInstances` | Unbounded Cloud Function scaling cost | 🟡 Medium under load |
| LinkedIn token expiry (no refresh) | Scheduled posts fail silently | 🟡 Medium — tokens expire in 60 days |
| Fake analytics data stored in Firestore | User trust / regulatory issue | 🟡 Medium |
| All posts fetched on every route change | Firestore cost explosion at scale | 🟡 Medium |
| `oauthStates` never cleaned up | Firestore storage growth | 🟢 Low initially |
| No error boundary in React tree | White screen on unhandled errors | 🟡 Medium |

---

*Last updated: 2026-05-23 · Generated from LinkedLoom codebase audit*
