cat << 'EOF' > AI_CONTEXT.md
# LinkedLoom - Complete System Architecture & Context Map

> **AI INSTRUCTION**: Read this file entirely before making ANY changes. It contains the exact technical stack, file structures, state management rules, database schemas, and coding patterns for the **LinkedLoom** project. Do not query or search the codebase for these basics; rely on this map to immediately begin implementation.

## 1. Technical Stack & Foundation
- **Core Framework**: Next.js 14+ (App Router).
- **UI/Styling**: React 19, Tailwind CSS (v4 via PostCSS), Shadcn UI, `next-themes` (Dark/Light mode), `lucide-react` (icons), `sonner` (toast notifications), `date-fns` (date formatting).
- **Fonts**: `DM Sans` (sans-serif text) and `DM Mono` (monospaced text), loaded via `next/font/google` in `app/layout.tsx`.
- **Backend Infrastructure**: Google Firebase Serverless Stack.
  - **Auth**: Firebase Authentication (Email/Password & Google OAuth).
  - **Database**: Firestore (NoSQL Document database).
  - **Server Logic**: Firebase Cloud Functions (2nd Gen, Node 22).
- **AI Engine**: Google Gemini Pro (via `@google/generative-ai` in Cloud Functions).
- **Integrations**: LinkedIn APIs (OAuth, Shares/Posts API).

---

## 2. Comprehensive Directory Structure

### `/app` - Next.js App Router Pages
*Defines the routing, layout, and top-level data fetching.*
- `globals.css`: Global styles, Tailwind directives, and Shadcn design tokens (CSS variables).
- `layout.tsx`: Root layout. Injects `ThemeProvider` (dark mode context) and `<Toaster />` (sonner notifications).
- `(auth)/`: Unauthenticated routes.
  - `login/page.tsx` & `register/page.tsx`: Credential & Google sign-in.
  - `auth/linkedin/page.tsx`: Handlers for LinkedIn OAuth linking.
- `(dashboard)/`: Core authenticated application.
  - `dashboard/page.tsx`: Main overview with stat cards and recent posts.
  - `analytics/page.tsx`: Charts (Recharts) and engagement metrics.
  - `calendar/page.tsx`: Visual scheduling overview.
  - `create/page.tsx`: Main Post Generator & Editor interface.
  - `schedule/page.tsx`: List of scheduled or draft posts.
- `(settings)/`: User configurations.
  - `settings/profile/page.tsx`, `settings/preferences/page.tsx`, `settings/billing/page.tsx`.
- `linkedin/callback/page.tsx`: Global OAuth callback receiver for LinkedIn.

### `/components` - React Component Architecture
*Strictly modular components grouped by domain.*
- `ui/`: Foundation primitives built with Radix UI & Shadcn (e.g., `button.tsx`, `dialog.tsx`, `select.tsx`, `tabs.tsx`). **Never add business logic here.**
- `layout/`: App shells and navigations.
  - `Sidebar.tsx`, `SettingsSidebar.tsx`: Navigation rails.
  - `Shell.tsx`: The main authenticated wrapper container.
  - `UserNav.tsx`: Top-right user dropdown menu.
- `features/`: Complex, domain-specific components with internal state.
  - `editor/PostEditor.tsx`: The input form, AI configuration (tone, topic), and text area.
  - `editor/PostPreview.tsx`: The simulated LinkedIn post UI.
  - `dashboard/PostCard.tsx`, `EditPostDialog.tsx`, `SchedulePostDialog.tsx`: Dashboard elements for managing post lifecycles.
  - `scheduler/SchedulerView.tsx`: Core scheduling interface.
  - `analytics/AnalyticsView.tsx`: Data visualization wrappers.
- `landing/`: Components specific to the unauthenticated marketing pages (`LandingHero`, `LandingFeatures`).

### `/lib` - Application Core & API Access
*All data-fetching and utility functions live here.*
- `api.ts`: **The central nervous system of the client app**. It exports `api.firebaseService` which acts as the single Data Access Layer (DAL). **UI components must call `api.firebaseService.*` instead of using raw Firebase SDKs.**
- `firebase/`: Modularized Firebase interactions.
  - `auth.ts`: `registerWithEmailAndPassword`, `loginWithEmailAndPassword`, `loginWithGoogle`, `getLinkedInAuthUrl`.
  - `collections.ts`: Enum `Collections { POSTS = "posts", ANALYTICS = "analytics", USERS = "users" }`. Use this instead of raw strings.
  - `posts.ts`: CRUD for posts.
  - `analytics.ts`: Analytics aggregation functions.
  - `integrations.ts`: Saving OAuth tokens.
  - `interfaces.ts`: (Deprecated, migrated to `/types`).
- `utils.ts`: Contains the `cn()` utility (clsx + tailwind-merge).

### `/types` - TypeScript Definitions
*Strict type enforcement files.*
- `index.ts`: 
  - `Post`: { `id`, `content`, `status` ("PUBLISHED" | "SCHEDULED" | "DRAFT"), `scheduledFor`, `user_id`, `linkedinUrn`, etc. }
  - `Stats`, `AnalyticsData` for dashboards.
- `auth.ts`: `AuthResponse`, `ApiError`.

### `/functions` - Backend Serverless Logic
*Firebase Cloud Functions located in `functions/src/`.*
- `ai.ts`: Callable function (`generatePost`). Receives prompt/topic/tone -> calls Google Gemini -> returns generated text to client.
- `linkedin.ts`: Connects to LinkedIn API for exchanging auth codes for Access Tokens and creating text/media posts.
- `scheduler.ts`: Pub/Sub cron jobs (`pubsub.schedule`). Wakes up every few minutes, queries Firestore for `status == "SCHEDULED"` where `scheduledFor <= now`, fetches user's LinkedIn token, and publishes.
- `index.ts`: The aggregator exporting all functions.

---

## 3. Database Schema (Firestore)

**1. `users/{userId}`**
- `uid` (string)
- `email` (string)
- `displayName` (string)
- `photoURL` (string)
- `createdAt` (timestamp)
- *Subcollection*: `connections/socials` -> Contains sensitive OAuth tokens (e.g., `{ linkedin: { accessToken, expiresIn } }`). Protected by strict Firebase Security Rules.

**2. `posts/{postId}`**
- `user_id` (string - indexed for fast querying)
- `content` (string - the post text)
- `tone` (string)
- `topic` (string)
- `status` (string enum: `"PUBLISHED" | "SCHEDULED" | "DRAFT" | "FAILED"`)
- `scheduledFor` (timestamp or null)
- `createdAt` (timestamp)
- `publishedAt` (timestamp or null)
- `linkedinUrn` (string - returned by LinkedIn upon successful publish)
- `versions` (array of strings - history of AI drafts)

---

## 4. Coding Practices & Rules

**Frontend UI/UX Guidelines**
1. **Server vs. Client Components**: By default, Next.js 14 uses React Server Components (RSC). Use `"use client"` ONLY when dealing with interactivity (e.g., `onClick`), React Hooks (`useState`), or client-side Firebase Auth/Firestore SDKs.
2. **Styling**: Exclusively use Tailwind CSS. Construct conditional classes using the `cn()` utility from `lib/utils.ts`. 
   - *Example*: `className={cn("base-class", isActive && "active-class")}`
3. **Icons**: Use `lucide-react` for all iconography.
4. **Notifications**: Use `sonner` via `toast("Message")` for all success/error handling feedback in the UI.

**Data & State Management**
1. **No direct Firebase in Components**: React components must NOT import `firebase/firestore` directly. All database logic must be written as exported async functions in `lib/firebase/*.ts` and exposed through `lib/api.ts`.
2. **TypeScript Strictness**: Never use the `any` type. Always interface payloads using `/types/index.ts`. If a type is missing, add it there.

**Backend / Cloud Functions Guidelines**
1. **Authentication Check**: Every Callable function (e.g., AI generation) must assert that `context.auth.uid` exists before executing.
2. **Secrets**: Use Firebase environment variables or Google Cloud Secret Manager for Gemini API Keys and LinkedIn Client Secrets. Never hardcode them.
3. **Scalability**: For operations that interact with external APIs (LinkedIn/Gemini), use Cloud Functions. Do not expose API keys to the client under any circumstances.

## 5. Development Workflow (AI Execution)
When asked to build a new feature:
1. Identify the route (`app/`) and the visual component (`components/features/`).
2. Identify the Data Model changes required in `types/index.ts`.
3. Add the database read/write operation in `lib/firebase/*.ts` and ensure it's exposed in `lib/api.ts`.
4. If third-party APIs or heavy compute are required, add a function in `functions/src/` and deploy it.
5. Apply changes directly to files using available editing tools, adhering to the architecture map above. No need to ask permission or run discovery searches if the location is defined here.
EOF