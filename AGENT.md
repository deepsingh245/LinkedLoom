# AGENT.md — LinkedLoom Codebase Reference

> **Purpose**: This file is the single source of truth for any AI agent working on this project.
> Read this file **first** — it eliminates the need to scan directories or read files you already know about.
> All paths are relative to the project root: `c:\Users\simra\Documents\repos\linkedloom\`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Full Directory Structure](#3-full-directory-structure)
4. [App Routes (Next.js App Router)](#4-app-routes-nextjs-app-router)
5. [Component Hierarchy](#5-component-hierarchy)
6. [State Management & Providers](#6-state-management--providers)
7. [Data Layer (lib/)](#7-data-layer-lib)
8. [TypeScript Types](#8-typescript-types)
9. [Firebase: Collections Schema](#9-firebase-collections-schema)
10. [Cloud Functions (Backend)](#10-cloud-functions-backend)
11. [Environment Variables](#11-environment-variables)
12. [Key Patterns & Conventions](#12-key-patterns--conventions)
13. [Known Issues & Tech Debt](#13-known-issues--tech-debt)
14. [Build & Development Commands](#14-build--development-commands)

---

## 1. Project Overview

**LinkedLoom** is a full-stack SaaS application for AI-powered LinkedIn content creation and scheduling.

**Core user flows:**
1. User registers/logs in (email+password, Google OAuth, or LinkedIn OAuth)
2. User creates a post: types manually OR generates via AI (Gemini), optionally uploads/generates an image
3. User saves as draft or schedules post for future LinkedIn publishing
4. Scheduler Cloud Function publishes scheduled posts automatically every 10 minutes
5. Dashboard shows posts, analytics, and scheduled content

**Project has two separate roots:**
- `/` — Next.js 16 frontend (deployed to Vercel or similar)
- `/functions/` — Firebase Cloud Functions v2 (deployed to Google Cloud)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `next@16.0.10`, React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui | Component primitives from Radix UI |
| Icons | Lucide React | `lucide-react@^0.561.0` |
| Animations | Framer Motion v12 + Tailwind `animate-*` | |
| Auth | Firebase Auth (email, Google, LinkedIn OAuth) | |
| Database | Firebase Firestore | NoSQL document store |
| Storage | Firebase Storage | Image uploads, profile photos |
| Backend | Firebase Cloud Functions v2 (`onCall`, `onRequest`, `onSchedule`, `onObjectFinalized`) | Node 22 |
| AI | Google Gemini (`gemini-2.5-flash-lite` for text, `gemini-2.5-flash-image` via Vertex AI for images) | |
| Image Processing | `sharp` in Cloud Functions | Generates WebP variants |
| Form Validation | Zod + react-hook-form + @hookform/resolvers | |
| Toast Notifications | Sonner | Wrapped in `lib/toast.tsx` |
| Date Handling | date-fns v4 | |
| Charts | Recharts | Used in analytics dashboard |
| Theme | next-themes | System/Light/Dark |

---

## 3. Full Directory Structure

```
linkedloom/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout — ThemeProvider, Toaster, Inter font, Google Fonts link
│   ├── page.tsx                      # Landing page (public, /)
│   ├── globals.css                   # Global CSS, Tailwind v4 @theme tokens, dark/light mode vars
│   ├── (auth)/                       # Auth route group — no shell/sidebar
│   │   ├── layout.tsx                # Minimal layout for auth pages
│   │   ├── login/page.tsx            # /login — email+password, Google, LinkedIn login
│   │   ├── register/page.tsx         # /register — email+password registration
│   │   └── auth/                     # (reserved)
│   ├── (dashboard)/                  # Protected route group — has Shell + Sidebar
│   │   ├── layout.tsx                # Wraps: AuthProvider > DataProvider > DashboardLayout(Shell)
│   │   ├── dashboard/page.tsx        # /dashboard — KPI cards + chart + recent posts
│   │   ├── create/page.tsx           # /create — full post editor
│   │   ├── schedule/page.tsx         # /schedule — all posts grid/list view
│   │   ├── analytics/page.tsx        # /analytics — analytics charts (UI ready)
│   │   ├── calendar/page.tsx         # /calendar — calendar view (UI ready)
│   │   └── integrations/
│   │       └── linkedin/callback/    # /integrations/linkedin/callback — OAuth callback handler
│   ├── (settings)/                   # Settings route group — has SettingsLayout + SettingsSidebar
│   │   ├── layout.tsx                # Wraps: AuthProvider > SettingsLayout
│   │   └── settings/
│   │       ├── profile/page.tsx      # /settings/profile — user profile + connected accounts
│   │       ├── preferences/page.tsx  # /settings/preferences — theme, notifications, AI defaults
│   │       └── billing/page.tsx      # /settings/billing — subscription (UI ready)
│   └── linkedin/
│       └── callback/page.tsx         # /linkedin/callback — legacy OAuth callback (duplicate of integrations/linkedin/callback)
│
├── components/
│   ├── providers/                    # React Context providers
│   │   ├── auth-provider.tsx         # AuthContext: { user, profile, loading } — listens to onAuthStateChanged, redirects to /login if unauthenticated
│   │   ├── data-provider.tsx         # DataContext: { posts, scheduledPosts, draftPosts, dashboardData, loading, syncing, refreshData } — fetches on mount + route change
│   │   └── theme-provider.tsx        # next-themes ThemeProvider wrapper
│   ├── features/                     # Feature-specific components
│   │   ├── dashboard/
│   │   │   ├── PostCard.tsx          # Post card shown in grid. Uses SmartImage. Has dropdown (Edit/Schedule/Delete)
│   │   │   ├── SchedulePostDialog.tsx # Radix Dialog to schedule a post with date/time picker
│   │   │   └── EditPostDialog.tsx    # Radix Dialog to edit post content inline
│   │   ├── editor/
│   │   │   ├── PostPreview.tsx       # Social platform preview: LinkedInPreview, XPreview, RedditPreview. Uses SmartImage.
│   │   │   └── post-editor/          # Modular post editor (split from monolithic PostEditor.tsx)
│   │   │       ├── index.tsx         # Orchestrator: all state, upload/save/schedule logic (534 lines)
│   │   │       ├── AIGeneration.tsx  # Left panel: topic, tone, length slider, advanced options, Generate button
│   │   │       ├── VisualAsset.tsx   # Image section: prompt, enhance, reference image, generate/upload
│   │   │       ├── PostSettings.tsx  # Schedule date picker + time inputs
│   │   │       ├── EditorTextArea.tsx# Content textarea + character counter
│   │   │       └── PlatformTabs.tsx  # TabsList showing connected platforms
│   │   ├── analytics/
│   │   │   └── AnalyticsView.tsx     # Analytics page content (charts, metrics)
│   │   └── scheduler/
│   │       └── SchedulerView.tsx     # Schedule page view wrapper
│   ├── layout/                       # App shell and navigation
│   │   ├── Shell.tsx                 # Main dashboard shell: Sidebar + main content area
│   │   ├── Sidebar.tsx               # Left nav sidebar with route links and logout
│   │   ├── UserNav.tsx               # Avatar dropdown in header (profile, settings, logout)
│   │   ├── SettingsLayout.tsx        # Settings page shell: SettingsSidebar + content
│   │   └── SettingsSidebar.tsx       # Settings left nav (Profile, Preferences, Billing)
│   ├── shared/                       # Shared utilities used across features
│   │   ├── Icons.tsx                 # Custom SVG icons: XIcon, RedditIcon, MediumIcon
│   │   └── SharedAlertDialog.tsx     # Reusable Radix AlertDialog for confirmations (e.g. delete)
│   └── ui/                           # shadcn/ui primitive components (do not modify internals)
│       ├── smart-image.tsx           # ⭐ Progressive image loader: shows low-res first, fades to high-res
│       ├── button.tsx, card.tsx, input.tsx, badge.tsx, etc.
│       ├── tabs.tsx                  # Radix Tabs — must always be wrapped in <Tabs> to use <TabsList>
│       ├── sonner.tsx                # Sonner Toaster with resolvedTheme support
│       └── mode-toggle.tsx           # Dark/light/system theme toggle
│
├── lib/                              # Services, utilities, and helpers
│   ├── firebase.ts                   # Firebase app init: auth, db, functions, storage exports. Connects to emulator if NEXT_PUBLIC_API_URL includes localhost
│   ├── api.ts                        # Central API barrel: api.firebaseService.{all methods}
│   ├── routes.ts                     # Route constants: Routes.DASHBOARD, Routes.LOGIN, etc.
│   ├── toast.tsx                     # Styled toast helpers: successToast(), dangerToast(), defaultToast()
│   ├── utils.ts                      # cn() utility (clsx + tailwind-merge)
│   └── firebase/                     # Feature-specific Firebase operations
│       ├── auth.ts                   # registerWithEmailAndPassword, loginWithEmailAndPassword, loginWithGoogle, logout, getLinkedInAuthUrl
│       ├── posts.ts                  # getAllPosts, getScheduledPosts, getDraftPosts, createPost, updatePost, deletePost, schedulePost, unschedulePost, publishPostNow
│       ├── analytics.ts              # getAnalyticsDashboardData — aggregates Firestore post data into DashboardData
│       ├── user.ts                   # getUserProfile, updateUserProfile, subscribeToUserProfile (real-time listener)
│       ├── storage.ts                # uploadPostAttachment, uploadProfilePhoto, getImageVariants, getStoragePathFromUrl
│       ├── integrations.ts           # getLinkedInAuthUrl (HTTP), exchangeLinkedInToken (HTTP)
│       ├── collections.ts            # Enum Collections { POSTS, ANALYTICS, USERS }
│       ├── functions.ts              # Enum FirebaseFunctions { GENERATE_POST, GENERATE_IMAGE, ENHANCE_IMAGE_PROMPT, ... }
│       └── interfaces.ts             # DashboardData interface
│
├── functions/                        # Firebase Cloud Functions (separate Node project)
│   ├── src/
│   │   ├── index.ts                  # Entry point — exports all functions
│   │   ├── ai.ts                     # generatePost (onCall), generateImage (onCall, Vertex AI), enhanceImagePrompt (onCall)
│   │   ├── linkedin.ts               # getLinkedInAuthUrl, exchangeLinkedInToken, publishToLinkedIn, getLinkedInAnalytics, uploadMediaToLinkedIn (helper)
│   │   ├── scheduler.ts              # checkScheduledPosts — runs every 10 minutes, publishes due posts
│   │   └── images.ts                 # generateResizedImages — Storage trigger on /attachments/ upload, generates 200x200/400x400/800x800 WebP variants
│   ├── firestore.rules               # ⚠️ CURRENTLY WIDE OPEN: allow read, write: if true (must fix for production)
│   ├── firestore.indexes.json        # Composite index: posts(user_id ASC, scheduledFor ASC)
│   ├── firebase.json                 # Emulator config, function deploy config
│   └── package.json                  # Node 22, functions dependencies (sharp, axios, firebase-admin, etc.)
│
├── types/
│   ├── index.ts                      # Post, UserProfile, UserPreferences, Stats, AnalyticsData, PostVersion
│   └── auth.ts                       # Auth-specific types
│
├── public/                           # Static assets
├── tailwind.config.ts                # Tailwind v4 config with theme tokens
├── next.config.ts                    # Next.js config (currently empty — no headers/CSP configured)
├── tsconfig.json                     # TypeScript config
├── package.json                      # Frontend dependencies
├── README.md                         # User-facing project documentation
├── ARCHITECTURE.md                   # High-level system architecture
└── PRODUCTION_READINESS_CHECKLIST.md # Production deployment security & readiness audit
```

---

## 4. App Routes (Next.js App Router)

| URL | File | Auth? | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | Public | Landing page |
| `/login` | `app/(auth)/login/page.tsx` | Public | Email/Google/LinkedIn login |
| `/register` | `app/(auth)/register/page.tsx` | Public | Email registration |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | 🔒 Yes | KPI cards, chart, recent posts |
| `/create` | `app/(dashboard)/create/page.tsx` | 🔒 Yes | Full post editor |
| `/schedule` | `app/(dashboard)/schedule/page.tsx` | 🔒 Yes | All posts with filter/search/grid/list |
| `/analytics` | `app/(dashboard)/analytics/page.tsx` | 🔒 Yes | Analytics dashboard |
| `/calendar` | `app/(dashboard)/calendar/page.tsx` | 🔒 Yes | Calendar view |
| `/settings/profile` | `app/(settings)/settings/profile/page.tsx` | 🔒 Yes | Profile editing, avatar, connected accounts |
| `/settings/preferences` | `app/(settings)/settings/preferences/page.tsx` | 🔒 Yes | Theme, notifications, AI defaults |
| `/settings/billing` | `app/(settings)/settings/billing/page.tsx` | 🔒 Yes | Billing (UI only) |
| `/integrations/linkedin/callback` | `app/(dashboard)/integrations/linkedin/callback/page.tsx` | Semi | LinkedIn OAuth callback |
| `/linkedin/callback` | `app/linkedin/callback/page.tsx` | Semi | Legacy LinkedIn OAuth callback |

**Auth protection mechanism:** Client-side only via `AuthProvider`. If `user` is null, it calls `router.push(Routes.LOGIN)`. **No `middleware.ts` exists** — there is no server-side route guard.

---

## 5. Component Hierarchy

```
RootLayout (app/layout.tsx)
└── ThemeProvider
    └── [page content]
        └── Toaster (Sonner)

Dashboard Pages:
DashboardLayout (app/(dashboard)/layout.tsx)
└── AuthProvider
    └── DataProvider
        └── Shell (components/layout/Shell.tsx)
            ├── Sidebar (components/layout/Sidebar.tsx)
            │   └── UserNav
            └── <page children>
                ├── dashboard/page.tsx → uses useData() and useAuth()
                ├── schedule/page.tsx → PostCard grid + list view
                └── create/page.tsx → PostEditor (post-editor/index.tsx)

Post Editor (components/features/editor/post-editor/index.tsx):
└── Tabs (wraps everything)
    ├── PlatformTabs (TabsList — must be inside Tabs)
    ├── AIGeneration
    ├── VisualAsset
    ├── PostSettings
    ├── EditorTextArea
    └── PostPreview (LinkedInPreview | XPreview | RedditPreview)

Settings Pages:
SettingsLayout (app/(settings)/layout.tsx)
└── AuthProvider
    └── SettingsLayout (components/layout/SettingsLayout.tsx)
        ├── SettingsSidebar
        └── <page children>
```

---

## 6. State Management & Providers

### AuthProvider (`components/providers/auth-provider.tsx`)

**Exports:** `AuthProvider`, `useAuth()`

**Context value:**
```typescript
{
  user: User | null;       // Firebase Auth User object
  profile: UserProfile | null; // Firestore user document (real-time subscription)
  loading: boolean;
}
```

**Behavior:**
- Listens to `onAuthStateChanged`
- If authenticated: subscribes to `users/{uid}` with `onSnapshot` for real-time profile updates
- If unauthenticated: redirects to `/login`
- Children are not rendered until `loading === false`: `{!loading && children}`

---

### DataProvider (`components/providers/data-provider.tsx`)

**Exports:** `DataProvider`, `useData()`

**Context value:**
```typescript
{
  posts: Post[];             // All posts for current user
  scheduledPosts: Post[];    // Posts with status SCHEDULED
  draftPosts: Post[];        // Posts with status DRAFT
  dashboardData: DashboardData | null;
  loading: boolean;          // True only on first load
  syncing: boolean;          // True on subsequent refreshes
  refreshData: () => Promise<void>;
}
```

**Behavior:**
- Re-fetches ALL data on every `pathname` change (no caching)
- Calls `getAllPosts`, `getScheduledPosts`, `getDraftPosts`, `getAnalyticsDashboardData` in parallel
- `useData()` throws if used outside `DataProvider`

---

## 7. Data Layer (lib/)

### Central API Object

Always use `api.firebaseService.*` to call Firebase operations:

```typescript
import { api } from "@/lib/api";

// Posts
api.firebaseService.getAllPosts(userId)
api.firebaseService.getDraftPosts(userId)
api.firebaseService.getScheduledPosts(userId)
api.firebaseService.createPost(postData: Partial<Post>)
api.firebaseService.updatePost(postId, data: Partial<Post>)
api.firebaseService.deletePost(postId)
api.firebaseService.schedulePost(postId, scheduledFor: string)
api.firebaseService.unschedulePost(postId)
api.firebaseService.publishPostNow(userId, content, articleUrl?, imageUrl?)

// Auth
api.firebaseService.registerWithEmailAndPassword(email, password, displayName)
api.firebaseService.loginWithEmailAndPassword(email, password)
api.firebaseService.loginWithGoogle()
api.firebaseService.logout()

// Profile
api.firebaseService.getUserProfile(uid)
api.firebaseService.updateUserProfile(uid, data: Partial<UserProfile>)
api.firebaseService.subscribeToUserProfile(uid, callback)

// Analytics
api.firebaseService.getAnalyticsDashboardData(userId): Promise<DashboardData | null>

// LinkedIn Integration (HTTP calls to Cloud Functions)
api.firebaseService.getLinkedInAuthUrl(): Promise<{ url: string; state: string }>
api.firebaseService.exchangeLinkedInToken(code, state, redirectUri?): Promise<{ success, customToken? }>
```

### Firebase Singletons (`lib/firebase.ts`)

```typescript
import { app, auth, db, functions, storage } from "@/lib/firebase";
```

**Important:** `connectFunctionsEmulator` is called automatically if `NEXT_PUBLIC_API_URL` contains `localhost` or `127.0.0.1`.

### Storage Utilities (`lib/firebase/storage.ts`)

```typescript
// Upload a post image — returns Firebase Storage download URL
uploadPostAttachment(userId: string, file: File): Promise<string>
// Path: users/{userId}/attachments/{timestamp}-{sanitized-filename}

// Upload profile photo
uploadProfilePhoto(userId: string, file: File): Promise<string>
// Path: users/{userId}/profile/{filename}

// Get resized variants for SmartImage progressive loading
getImageVariants(originalUrl: string): Promise<ImageVariants>
// Returns: { low: string | null, medium: string | null, high: string }
// Low = 200x200 WebP, Medium = 400x400 WebP, High = original URL

// Extract storage path from download URL
getStoragePathFromUrl(url: string): string | null
```

### Toast Helpers (`lib/toast.tsx`)

```typescript
import { successToast, dangerToast, defaultToast } from "@/lib/toast";

successToast("Post saved!");         // Green, 3000ms, top-center
dangerToast("Something failed.");    // Red, 4000ms, top-center
defaultToast("Info message");        // Blue, 3000ms, top-center
```

### Routes (`lib/routes.ts`)

```typescript
import { Routes } from "@/lib/routes";

Routes.HOME                  // "/"
Routes.LOGIN                 // "/login"
Routes.REGISTER              // "/register"
Routes.DASHBOARD             // "/dashboard"
Routes.CREATE_POST           // "/create"
Routes.SCHEDULE              // "/schedule"
Routes.CALENDAR              // "/calendar"
Routes.ANALYTICS             // "/analytics"
Routes.SETTINGS_PROFILE      // "/settings/profile"
Routes.SETTINGS_PREFERENCES  // "/settings/preferences"
Routes.SETTINGS              // "/settings/profile" (alias)
```

### Cloud Function Names (`lib/firebase/functions.ts`)

```typescript
import { FirebaseFunctions } from "@/lib/firebase/functions";

FirebaseFunctions.GENERATE_POST           // "generatePost"
FirebaseFunctions.GENERATE_IMAGE          // "generateImage"
FirebaseFunctions.ENHANCE_IMAGE_PROMPT    // "enhanceImagePrompt"
FirebaseFunctions.GET_LINKEDIN_AUTH_URL   // "getLinkedInAuthUrl"
FirebaseFunctions.EXCHANGE_LINKEDIN_TOKEN // "exchangeLinkedInToken"
```

### Firestore Collection Names (`lib/firebase/collections.ts`)

```typescript
import { Collections } from "@/lib/firebase/collections";

Collections.POSTS      // "posts"
Collections.USERS      // "users"
Collections.ANALYTICS  // "analytics"
```

---

## 8. TypeScript Types

### `Post` (`types/index.ts`)

```typescript
interface Post {
  id: string;
  content: string;
  status: "PUBLISHED" | "SCHEDULED" | "DRAFT" | "published" | "scheduled" | "draft" | string;
  // ⚠️ Status is mixed-case in the codebase — analytics.ts normalises via .toUpperCase()
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  date?: string;
  topic?: string;
  tone?: string;
  mediaUrls?: string[];
  imageUrl?: string | null;
  articleUrl?: string | null;
  linkedinUrn?: string;
  versions?: PostVersion[];
  user_id?: string;
  scheduledFor?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
}
```

### `UserProfile` (`types/index.ts`)

```typescript
interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  bio?: string;
  phone?: string;
  website?: string;
  twitter?: string;    // legacy
  x?: string;         // Twitter/X handle
  linkedin?: string;  // LinkedIn connection — truthy = connected
  reddit?: string;
  medium?: string;
  preferences?: UserPreferences;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
```

**LinkedIn connected check:** `if (profile?.linkedin)` — the field stores the user's LinkedIn display name when connected.

### `DashboardData` (`lib/firebase/interfaces.ts`)

```typescript
interface DashboardData {
  totalPosts: number;
  totalDrafts: number;
  totalScheduled: number;
  totalFailed: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  postsThisWeek?: number;
  chartData?: any[];
  metrics?: {
    impressions: string;
    followers: string;
    engagement: string;
    views: string;
  };
}
```

### Zod Schemas (`lib/schemas/auth.ts`)

```typescript
loginSchema    // email (email) + password (min 6)
registerSchema // email + password (min 6) + confirmPassword (must match)
```

---

## 9. Firebase: Collections Schema

### `users/{uid}` (top-level)

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
| `phone` | string | nullable |
| `website` | string | nullable |
| `linkedin` | string | Set to display name when LinkedIn is connected |
| `twitter` / `x` | string | nullable |
| `reddit` | string | nullable |
| `preferences` | object | `UserPreferences` shape |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `users/{uid}/connections/linkedin` (subcollection)

| Field | Type | Notes |
|---|---|---|
| `provider` | string | `"linkedin"` |
| `providerUserId` | string | LinkedIn `sub` claim |
| `accessToken` | string | ⚠️ Stored plaintext in Firestore |
| `refreshToken` | string | nullable |
| `expiresAt` | Date | Access token expiry |
| `refreshExpiresAt` | Date | nullable |
| `name` | string | |
| `email` | string | |
| `picture` | string | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `posts/{postId}` (top-level)

| Field | Type | Notes |
|---|---|---|
| `user_id` | string | **Indexed** — used in all queries |
| `content` | string | Post text body |
| `status` | string | `"DRAFT"` / `"SCHEDULED"` / `"PUBLISHED"` / `"FAILED"` |
| `tone` | string | `"PROFESSIONAL"`, `"CASUAL"`, etc. (uppercase) |
| `topic` | string | nullable |
| `imageUrl` | string | nullable — Firebase Storage download URL |
| `mediaUrls` | string[] | Array version of imageUrl |
| `articleUrl` | string | nullable |
| `linkedinUrn` | string | LinkedIn post URN after publishing |
| `scheduledFor` | timestamp | **Indexed** — when to publish |
| `publishedAt` | timestamp | nullable |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `views` / `likes` / `comments` / `shares` | number | nullable, default 0 |

### `analytics/{userId}/dashboard/data`

Cached from the `getLinkedInAnalytics` Cloud Function. Shape matches `DashboardData`.

### `oauthStates/{stateId}`

| Field | Type | Notes |
|---|---|---|
| `createdAt` | string | ISO timestamp |

Deleted on use. Never has a TTL. Can grow indefinitely if user abandons OAuth flow.

---

## 10. Cloud Functions (Backend)

All functions are in `functions/src/`. Exported via `functions/src/index.ts`.

### AI Functions (`functions/src/ai.ts`)

**All are `onCall` — require Firebase Auth token. Client calls via `httpsCallable(functions, name)`.**

| Function | Type | Input | Output | Notes |
|---|---|---|---|---|
| `generatePost` | onCall | `{ topic, tone, length, excludeIcons, creativeExpansion }` | `{ content: string }` | Uses `gemini-2.5-flash-lite` via `@google/generative-ai` |
| `generateImage` | onCall | `{ prompt, referenceImage? }` | `{ imageUrl: string }` (base64 data URI) | Uses Vertex AI `gemini-2.5-flash-image`. Returns `data:image/png;base64,...` |
| `enhanceImagePrompt` | onCall | `{ prompt }` | `{ enhancedPrompt: string }` | Uses `gemini-2.5-flash-lite` |

**Vertex AI config in `ai.ts`:**
- `project: process.env.PROJECT_ID || 'linkedloom'` ← hardcoded fallback (known issue)
- `location: 'us-central1'`

### LinkedIn Functions (`functions/src/linkedin.ts`)

**These are `onRequest` HTTP endpoints — called via `fetch()`, NOT `httpsCallable()`.**

| Function | URL | Auth | Input | Output |
|---|---|---|---|---|
| `getLinkedInAuthUrl` | `{API_URL}/getLinkedInAuthUrl` | None | GET | `{ url: string, state: string }` |
| `exchangeLinkedInToken` | `{API_URL}/exchangeLinkedInToken` | None (validates state) | `{ code, state }` | `{ success: true, customToken: string }` |
| `publishToLinkedIn` | `{API_URL}/publishToLinkedIn` | None (trusts userId from body ⚠️) | `{ userId, content, articleUrl?, imageUrl? }` | `{ success: true, data: {} }` |
| `getLinkedInAnalytics` | `{API_URL}/getLinkedInAnalytics` | None (trusts userId from body ⚠️) | `{ userId }` | `{ success: true, data: DashboardData }` |

**⚠️ CORS WARNING:** `publishToLinkedIn` and `getLinkedInAnalytics` have `res.set('Access-Control-Allow-Origin', 'http://localhost:3000')` hardcoded — this will break in production.

**LinkedIn OAuth flow:**
1. Frontend calls `getLinkedInAuthUrl` → gets URL + state
2. User redirected to LinkedIn → returns to `/linkedin/callback?code=...&state=...`
3. Callback page calls `exchangeLinkedInToken` → receives `customToken`
4. Frontend calls `signInWithCustomToken(auth, customToken)` → user is logged in

### Scheduler (`functions/src/scheduler.ts`)

```
checkScheduledPosts — onSchedule("every 10 minutes")
```

1. Queries `posts` where `status == "SCHEDULED"` AND `scheduledFor <= now`
2. For each due post: fetches `users/{userId}/connections/linkedin`
3. Calls `publishToLinkedInInternal(connection, post.content, undefined, post.imageUrl)`
4. Updates post: `status = "PUBLISHED"` on success, `status = "FAILED"` on error

### Image Resizing (`functions/src/images.ts`)

```
generateResizedImages — onObjectFinalized({ cpu: 2, memory: "1GiB" })
```

- Triggers on ANY file uploaded to Storage
- **Skips** if: not an image, already in `resized/` path, not in `/attachments/` path
- Generates 3 WebP variants using `sharp`:
  - `200x200` (low) — for card thumbnails
  - `400x400` (medium) — for previews
  - `800x800` (large) — for full display
- Output path: `resized/{original-dir}/{filename}_{size}.webp`
- Cache-Control: `public,max-age=31536000` (1 year)

---

## 11. Environment Variables

### Frontend (`.env.local` — root)

```bash
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=   # Optional — Firebase Analytics

# Cloud Functions base URL
NEXT_PUBLIC_API_URL=                   # e.g. https://us-central1-{project}.cloudfunctions.net
                                       # Use http://127.0.0.1:5001/{project}/us-central1 for local emulator

# LinkedIn OAuth (only client ID is public-safe)
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=
NEXT_PUBLIC_LINKEDIN_REDIRECT_URI=     # e.g. https://yourdomain.com/linkedin/callback
```

### Cloud Functions (`.env` in `functions/` — NEVER commit)

```bash
GEMINI_API_KEY=              # Google Gemini API key for text generation
LINKEDIN_CLIENT_ID=          # LinkedIn OAuth App client ID
LINKEDIN_CLIENT_SECRET=      # LinkedIn OAuth App client secret
LINKEDIN_REDIRECT_URI=       # Must match LinkedIn App settings
PROJECT_ID=                  # GCP Project ID for Vertex AI (ai.ts)
FRONTEND_URL=                # ⚠️ Currently missing — needed to fix hardcoded CORS
```

---

## 12. Key Patterns & Conventions

### Adding a New Feature

1. **Type**: Add interfaces to `types/index.ts` or `lib/firebase/interfaces.ts`
2. **Data**: Add Firestore operations to `lib/firebase/{feature}.ts`, export via `lib/api.ts`
3. **Cloud Function**: Add to `functions/src/{feature}.ts`, export via `functions/src/index.ts`
4. **Component**: Create in `components/features/{feature}/`
5. **Page**: Create in `app/(dashboard)/{route}/page.tsx`

### Calling Cloud Functions

```typescript
// onCall functions (AI, etc.) — automatically sends Firebase Auth token
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { FirebaseFunctions } from "@/lib/firebase/functions";

const generatePost = httpsCallable(functions, FirebaseFunctions.GENERATE_POST);
const result = await generatePost({ topic, tone, length });
const data = result.data as { content: string };

// onRequest HTTP functions (LinkedIn) — manual fetch
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/publishToLinkedIn`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId, content, imageUrl }),
});
```

### Auth Access in Components

```typescript
import { useAuth } from "@/components/providers/auth-provider";
const { user, profile, loading } = useAuth();
// user = Firebase Auth User (has .uid, .email, .displayName, .photoURL)
// profile = Firestore UserProfile (has .linkedin, .jobTitle, .bio, etc.)
```

### Data Access in Components

```typescript
import { useData } from "@/components/providers/data-provider";
const { posts, scheduledPosts, draftPosts, dashboardData, loading, refreshData } = useData();
// Must be used within DataProvider (dashboard layout only)
```

### Images — Always Use SmartImage for Storage URLs

```typescript
import { SmartImage } from "@/components/ui/smart-image";

// For Firebase Storage URLs (post images, etc.):
<SmartImage src={post.imageUrl} alt="Post image" className="w-full h-full object-cover" />
// Automatically fetches low-res (200x200) variant first, fades to high-res

// For non-storage images (avatars, external), use standard <img> or Next.js <Image>
```

### Draft Post Edit Flow (LocalStorage)

When user clicks "Edit" on a PostCard:
1. `PostCard.tsx` → `localStorage.setItem("draft_post", JSON.stringify(post))`
2. Navigates to `/create`
3. `post-editor/index.tsx` reads and clears `draft_post` from localStorage on mount
4. `editingPostId` state is set — save button shows "Update Post" instead of "Save Draft"

### Toast Notifications

```typescript
import { successToast, dangerToast, defaultToast } from "@/lib/toast";
// Never use toast() directly from sonner in feature components — always use these helpers
```

### Tailwind CSS Class Merging

```typescript
import { cn } from "@/lib/utils";
// Uses clsx + tailwind-merge
className={cn("base-classes", condition && "conditional-class", props.className)}
```

### Platform Connection Check

```typescript
// In post-editor/index.tsx
const connectedPlatforms = useMemo(() => {
  const list = [];
  if (profile?.linkedin) list.push("linkedin");
  if (profile?.twitter || profile?.x) list.push("x");
  if (profile?.reddit) list.push("reddit");
  return list.length > 0 ? list : ["linkedin"]; // fallback to linkedin
}, [profile]);
```

---

## 13. Known Issues & Tech Debt

Critical items that affect production — do not introduce more debt in these areas:

| ID | Severity | Location | Issue |
|---|---|---|---|
| KI-1 | 🔴 Critical | `functions/firestore.rules` | `allow read, write: if true` — DB is publicly accessible |
| KI-2 | 🔴 Critical | `functions/src/linkedin.ts:339,400` | CORS hardcoded to `http://localhost:3000` |
| KI-3 | 🔴 Critical | `functions/src/linkedin.ts:348` | `publishToLinkedIn` trusts `userId` from request body without verifying ID token |
| KI-4 | 🔴 Critical | `app/(auth)/login/page.tsx:65` | Raw Firebase error codes (e.g. `auth/user-not-found`) shown to users |
| KI-5 | 🔴 Critical | Root (missing) | No `middleware.ts` — zero server-side route protection |
| KI-6 | 🔴 Critical | `functions/src/ai.ts:6` | `project: process.env.PROJECT_ID \|\| 'linkedloom'` hardcoded fallback |
| KI-7 | 🟠 High | All Cloud Functions | No rate limiting on AI generation endpoints |
| KI-8 | 🟠 High | All Cloud Functions | No `maxInstances` — unbounded scaling |
| KI-9 | 🟠 High | `next.config.ts` | No security headers (CSP, X-Frame-Options, etc.) |
| KI-10 | 🟠 High | `lib/firebase/posts.ts` | No `limit()` on any Firestore query — all posts fetched at once |
| KI-11 | 🟠 High | Storage | No Firebase Storage security rules file |
| KI-12 | 🟡 Medium | `components/providers/data-provider.tsx:83` | Refetches all data on every route change (no caching) |
| KI-13 | 🟡 Medium | `functions/src/linkedin.ts:489-496` | Analytics chart data is fabricated when LinkedIn API blocks access |
| KI-14 | 🟡 Medium | `oauthStates` collection | No TTL — stale entries accumulate forever |
| KI-15 | 🟡 Medium | `types/index.ts:10` | `Post.status` type allows both uppercase and lowercase variants |
| KI-16 | 🟡 Medium | LinkedIn connection | No access token refresh logic — tokens expire after ~60 days |
| KI-17 | 🟡 Medium | Root (missing) | No `.env.example` file despite README referencing it |
| KI-18 | 🟢 Low | `components/ui/smart-image.tsx` | Variant URL in-memory cache resets on navigation |
| KI-19 | 🟢 Low | `functions/firebase.json:53` | `support@undefined.firebaseapp.com` — invalid support email |
| KI-20 | 🟢 Low | `lib/firebase/storage.ts:90` | `console.log` leaks full Firebase Storage download URLs |

---

## 14. Build & Development Commands

### Frontend (run from project root)

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build (must pass before deployment)
npm run start        # Start production server
npm run lint         # ESLint check
```

### Cloud Functions (run from `functions/` directory)

```bash
npm run build        # Compile TypeScript to lib/
npm run build:watch  # Watch mode
npm run deploy       # Deploy all functions: firebase deploy --only functions
npm run logs         # Tail Cloud Function logs
npm run serve        # Build + start emulator (functions only)
```

### Firebase CLI (run from `functions/` directory)

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase emulators:start    # Start all emulators (auth, firestore, functions, storage)
```

### Recommended Pre-Deployment Sequence

```bash
# 1. Audit dependencies
npm audit
npm audit --prefix functions

# 2. Build frontend
npm run build

# 3. Build functions
cd functions && npm run build && cd ..

# 4. Deploy rules first
firebase deploy --only firestore:rules,firestore:indexes

# 5. Deploy functions
firebase deploy --only functions

# 6. Deploy frontend to Vercel
vercel --prod
```

---

*This file was generated from a full codebase audit on 2026-05-23.*
*Update this file whenever you add new routes, components, environment variables, or Cloud Functions.*
