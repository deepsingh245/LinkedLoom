# LinkedLoom

AI-powered post writer, scheduler and analytics for **LinkedIn** and **Reddit**. Write once (or let Gemini draft it), preview per platform, schedule, and a Cloud Function publishes it for you.

> **Private, proprietary project** (not open source). Maintainer notes live in `docs/` – start with [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

| | |
|---|---|
| **Production branch** | `prod-v3` |
| **Firebase project** | `linkedloom` |
| **Status** | Pre-launch – see [`PRODUCTION_READINESS_CHECKLIST.md`](PRODUCTION_READINESS_CHECKLIST.md) |

## Where to find things (read this when you forget)

| I want to… | Read |
|---|---|
| Deploy rules / indexes / storage / functions / frontend | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Set up or debug Reddit, Reddit API access/policy | [`REDDIT_INTEGRATION.md`](REDDIT_INTEGRATION.md) |
| Know what's blocking launch | [`PRODUCTION_READINESS_CHECKLIST.md`](PRODUCTION_READINESS_CHECKLIST.md) |
| Understand the whole codebase quickly (also for AI assistants) | [`AGENT.md`](AGENT.md) |
| Navigate the code structure | `graphify-out/GRAPH_REPORT.md` (local, gitignored – rebuild with `/graphify . --update`) |

## Features

- **AI post generator** – Gemini (`gemini-2.5-flash-lite`) for text, Vertex AI for images; tones: professional, viral, storytelling…
- **Editor with live previews** for LinkedIn and Reddit (Reddit tab has an optional subreddit field).
- **Scheduler** – `checkScheduledPosts` runs every 10 minutes and publishes due posts to every connected platform.
- **Publishing** – LinkedIn (UGC posts) and Reddit (self/link posts) through OAuth connections stored server-side.
- **Analytics dashboard** – post counts and engagement per platform.
- **Image pipeline** – uploads to Firebase Storage; a Storage trigger creates WebP variants (200/400/800 px); `<SmartImage />` shows low-res first.
- **Legal pages** – `/privacy` and `/terms` (needed for Reddit API approval).
- **UI** – shadcn/ui + Tailwind v4, light/dark/system theme.

## Architecture

```text
Browser (Next.js 16, React 19, TanStack Query)
   │  Firebase SDK: Auth · Firestore · Storage
   │  fetch(NEXT_PUBLIC_API_URL/<function>)  + Firebase ID token
   ▼
Cloud Functions v2 (Node 22, functions/src)
   ├─ ai.ts         Gemini / Vertex AI
   ├─ linkedin.ts   LinkedIn OAuth + publish + analytics
   ├─ reddit.ts     Reddit OAuth + publish + disconnect + analytics
   ├─ scheduler.ts  every-10-min scheduled publisher
   └─ images.ts     Storage trigger → resized WebP
Firestore: users/{uid} · users/{uid}/connections/{provider} (tokens, backend-only) · posts · analytics · oauthStates
```

Security model: the client can only touch its own `users/{uid}` doc and its own `posts`; OAuth tokens and the Reddit post log are readable by Cloud Functions only (see `functions/firestore.rules`, `functions/storage.rules`).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · TanStack Query · react-hook-form + zod · Firebase (Auth, Firestore, Storage, Functions v2) · Google Gemini / Vertex AI · sharp · axios.

## Run locally

```bash
npm install
cd functions && npm install && cd ..
```

1. Create `.env` in the repo root with the `NEXT_PUBLIC_*` values (list in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) §3).
2. Create `functions/.env` with the backend keys (Gemini, LinkedIn, Reddit – same doc).
3. Start the emulators and the app:

```bash
cd functions && firebase emulators:start    # terminal 1
npm run dev                                 # terminal 2 → http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/linkedloom/us-central1` when using the emulators.

Useful scripts: `npm run lint`, `npm run build` (root) · `npm run build`, `npm run logs` (in `functions/`).

## Platform setup

- **LinkedIn** – app at <https://www.linkedin.com/developers/apps>; redirect `https://<domain>/integrations/linkedin/callback`; keys `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`.
- **Reddit** – needs Reddit API access approval first, then a **web app** at <https://www.reddit.com/prefs/apps>; redirect `https://<domain>/integrations/reddit/callback`; keys `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REDIRECT_URI`, `REDDIT_USER_AGENT`. Details and policy checklist: [`REDDIT_INTEGRATION.md`](REDDIT_INTEGRATION.md).
- **Firebase** – Blaze plan (Functions + external APIs), enable Auth (email, Google), Firestore, Storage; add the prod domain to Auth → Authorized domains.

## Project structure

```text
app/
  (auth)/          login, register, auth/linkedin
  (dashboard)/     dashboard, create, schedule, calendar, analytics, integrations/reddit/callback
  (settings)/      settings/profile, settings/preferences
  (legal)/         privacy, terms
  integrations/linkedin/callback, linkedin/callback
components/        features/ · landing/ · layout/ · providers/ · shared/ · ui/ · legal/
lib/               firebase/ (posts, integrations, storage…) · query/ (TanStack hooks, keys) · api.ts · routes.ts
functions/         Cloud Functions + firestore.rules, storage.rules, firestore.indexes.json, firebase.json
docs/              DEPLOYMENT.md
types/             shared TypeScript types
```

## Branch & release workflow

`feature/*` → `dev` → **`prod-v3`** → deploy. Deploy commands and the release checklist are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## License

All rights reserved. Not licensed for use, copying or distribution.
