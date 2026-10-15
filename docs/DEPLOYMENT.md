# LinkedLoom – Deployment & Ops Cheat Sheet

Private project. This is the "I forgot how to do X" doc.

- Firebase project: `linkedloom` (alias `default` in `functions/.firebaserc`)
- **Production branch: `prod-v3`** (see §1 – it doesn't exist yet as of 2026-10-12)
- All `firebase` commands run from the **`functions/`** folder (that's where `firebase.json` lives, there is none in the repo root).

---

## 1. Branches

| Branch | Purpose |
|---|---|
| `prod-v3` | **Production.** Only deploy from here. |
| `prod-v2` | Previous production line (currently checked out; all the Reddit work is here). |
| `dev` | Integration/testing |
| `main` | Stable base |
| `feature/*` | Feature work |

> `prod-v3` is **not created yet** (only `prod-v2` exists locally and on origin). To create it from the current state:
> ```bash
> git checkout prod-v2
> git checkout -b prod-v3
> git push -u origin prod-v3
> ```
> Before that, commit the pending changes (`git status`).

Flow: `feature/x` → `dev` → `prod-v3` → deploy. Never deploy functions/rules from a feature branch.

---

## 2. One-time setup on a new machine

```bash
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
npm install
```

Check the project: `cd functions && firebase use` (should say `linkedloom`).

---

## 3. Environment variables

### Frontend – `.env` / `.env.local` in the repo root (never commit)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_API_URL=https://us-central1-linkedloom.cloudfunctions.net   # local emulator: http://127.0.0.1:5001/linkedloom/us-central1
NEXT_PUBLIC_CONTACT_EMAIL=you@yourdomain.com                            # shown on /privacy and /terms
NEXT_PUBLIC_AUTOPILOT_ENABLED=false                                      # "true" shows the AI Autopilot nav + /autopilot pages (keep false in prod until launch)
```

Where the frontend env goes in prod: set the same variables in your host's dashboard (Vercel etc.), then redeploy – `NEXT_PUBLIC_*` values are baked in at build time.

### Backend – `functions/.env` (never commit)

```bash
GEMINI_API_KEY=
PROJECT_ID=linkedloom

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=https://<prod-domain>/integrations/linkedin/callback

REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=https://<prod-domain>/integrations/reddit/callback
REDDIT_USER_AGENT=web:linkedloom:1.0 (by /u/<your_reddit_username>)
REDDIT_MAX_POSTS_PER_DAY=5

# AI (Autopilot Phase 2) – managed keys LinkedLoom pays for
OPENAI_API_KEY=                 # only needed if managed calls use OpenAI (default managed provider is Gemini)
AUTOPILOT_TRIAL_CREDITS=200     # credits every new workspace starts with
EDITOR_TEXT_DAILY_CAP=100       # Create Post text generations per user per day (metered, free)
EDITOR_IMAGE_DAILY_CAP=30       # Create Post images per user per day
BYOK_DAILY_CALL_CAP=200         # AI calls per workspace per day on users' own keys
AUTOPILOT_DAILY_RUNS=10         # research runs per workspace per day
AUTOPILOT_RUN_MAX_AI_CALLS=12    # hard cap of AI calls inside one research run
# Scheduled + durable runs (Phase 4)
AUTOPILOT_MAX_PENDING_DRAFTS=6              # scheduled research pauses while this many drafts wait for review
AUTOPILOT_MIN_CREDITS_TO_RUN=20             # scheduled runs are skipped below this many available credits (managed billing only)
AUTOPILOT_RESEARCH_LEAD_MINUTES=90          # research starts this long before each posting window
AUTOPILOT_MAX_SCHEDULE_LATENESS_MINUTES=240 # a scheduled run overdue by more than this is skipped (window passed)
AUTOPILOT_STUCK_AFTER_MINUTES=20            # a run with no progress this long is re-queued/failed by the reaper
RESEARCH_RETRY_MIN_BACKOFF=15               # seconds before Cloud Tasks retries a failed step (Firebase param; 1 in the test env)
```

Users' own keys (BYOK) are **not** in `.env`: they go to Google Cloud Secret Manager at runtime (see §7.1). Managed keys still come from `.env`; moving them to `firebase functions:secrets:set` is a later hardening step (remove them from `.env` at the same time, or deploy fails on the name clash).

`firebase deploy --only functions` uploads `functions/.env` with the code. Using different values for prod vs dev: create `functions/.env.linkedloom` (loaded for project id `linkedloom`) – it overrides `.env`.

Redirect URIs must match **exactly** what is registered in the LinkedIn app and the Reddit app (see `docs/reddit-integration/`).

---

## 4. Firestore rules

File: `functions/firestore.rules`. Summary of what they enforce:
- `users/{uid}`: only that user. `users/{uid}/connections/*` and `redditPosts/*` (OAuth tokens): **nobody from the client**, backend only.
- `posts/{id}`: only the owner (`user_id == auth.uid`).
- Everything else (`oauthStates`, `analytics`): backend only.

Deploy:
```bash
cd functions
firebase deploy --only firestore:rules
```

Test before deploying (emulator): `firebase emulators:start --only firestore,auth` and run the app against it. Rollback: Firebase Console → Firestore → Rules → history → pick the old version → Publish.

> Admin SDK (Cloud Functions) ignores rules, so scheduler/publish/OAuth still work.

## 5. Firestore indexes

File: `functions/firestore.indexes.json`. The scheduler query needs `(status, scheduledFor)`; the schedule page needs `(user_id, scheduledFor)`.

```bash
firebase deploy --only firestore:indexes
```
Building takes a few minutes; if you see `FAILED_PRECONDITION: The query requires an index` in the logs, click the link in the error and then copy the generated index into the JSON file so it's tracked.

## 6. Storage rules

File: `functions/storage.rules` (wired in `functions/firebase.json` → `"storage"`). Before 2026-10-12 this file did not exist, so the bucket was running on whatever default rules were set in the console.

What it allows:
- `users/{uid}/attachments/*` and `users/{uid}/profile/*`: owner can read/write/delete; uploads must be `image/*` and < 10 MB.
- `resized/users/{uid}/**`: owner read; no client writes (the `generateResizedImages` function writes them).
- everything else denied.

Deploy:
```bash
firebase deploy --only storage
```
First time on a project, Storage must be enabled in the console (Build → Storage → Get started) and the bucket name must equal `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

Note: images are shared to LinkedIn/Reddit through the **download URL** (it contains a token and works regardless of rules), so tightening read rules doesn't break publishing.

## 7. Cloud Functions

Deploy everything:
```bash
cd functions
npm run build          # must pass (tsc)
firebase deploy --only functions
```
Deploy specific ones (faster, safer):
```bash
firebase deploy --only functions:exchangeRedditToken,functions:publishToReddit
```
Whole "release" in one go:
```bash
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

Functions in this repo: `generatePost`, `generateImage`, `enhanceImagePrompt` (ai.ts) · LinkedIn: `getLinkedInAuthUrl`, `exchangeLinkedInToken`, `publishToLinkedIn`, `getLinkedInAnalytics` · Reddit: `getRedditAuthUrl`, `exchangeRedditToken`, `publishToReddit`, `disconnectReddit`, `getRedditAnalytics` · `checkScheduledPosts` (every 10 min) · `generateResizedImages` (Storage trigger).

AI Autopilot: personas `createPersona`, `updatePersona`, `setPersonaStatus`, `deletePersona`, `setAutopilotEnabled` · AI `addAIConnection`, `testAIConnection`, `revokeAIConnection`, `testPersonaGeneration` · credits `adminGrantCredits`, `sweepCreditReservations` (every 15 min) · research `runResearch` (queues a run and returns its id), `retryRun`, `cancelRun`, `updateContentItem`, `setContentStatus`, `exportContentToDraft`, task worker `researchStep` (Cloud Tasks, one step per task), schedulers `dispatchResearch` (every 10 min), `reapResearchRuns` (every 15 min), `reconcileResearchSchedule` (daily), admin hooks `adminDispatchResearch` and `adminReapResearchRuns` (need the `admin: true` claim).

Requirements: project on the **Blaze** plan; Node 22; Cloud Scheduler + Pub/Sub APIs are enabled automatically on first deploy of `checkScheduledPosts`.

### 7.2 One-time setup for scheduled/durable research (Phase 4)

1. Enable **Cloud Tasks**: `gcloud services enable cloudtasks.googleapis.com --project linkedloom`. The first deploy of `researchStep` creates its queue automatically.
2. The functions runtime service account must be allowed to queue tasks: grant it `roles/cloudtasks.enqueuer` and `roles/iam.serviceAccountUser` on itself (without these `runResearch` fails with a permission error).
3. Firestore **TTL policies** (Console → Firestore → Time-to-live): collection group `artifacts`, field `expireAt` (temporary fetched article text; the app also deletes it when a run ends), and `researchItems.expireAt`.
4. Indexes: `firebase deploy --only firestore:indexes` adds collection-group overrides for `personas.research.autoRun` and `workflowRuns.status` (used by the reconcile job and the reaper). They take a few minutes to build.
5. Automatic research is **opt-in per persona** and runs only for `active` personas with a feed or web search; the kill switch ("Stop all") stops everything. Check logs with `firebase functions:log --only dispatchResearch,researchStep`.
6. Ops: with the admin claim you can call `adminDispatchResearch` (`{ reconcile: true }` rebuilds the schedule index) and `adminReapResearchRuns` by hand.
7. Privacy: fetched article text is kept in server-only run artifacts for the duration of a run (deleted at the end, ≤24 h by TTL). `/privacy` must say so (see `docs/ai-autopilot/HANDOFF.md` §3).

### 7.1 One-time setup for AI Autopilot (BYOK keys in Secret Manager)

1. Enable the API: `gcloud services enable secretmanager.googleapis.com --project linkedloom`.
2. Find the runtime service account of the functions (Console → Cloud Run → a function → Security; for 2nd-gen functions it's usually `PROJECT_NUMBER-compute@developer.gserviceaccount.com`).
3. Let it manage only BYOK secrets (names start with `byok-`):
   ```bash
   gcloud projects add-iam-policy-binding linkedloom \
     --member="serviceAccount:<RUNTIME_SA>" --role="roles/secretmanager.admin" \
     --condition='expression=resource.name.startsWith("projects/<PROJECT_NUMBER>/secrets/byok-"),title=byok-secrets-only'
   ```
   (`secrets.create` is checked on the project, so if creation is denied with the condition, use a custom role with `secretmanager.secrets.create` on the project plus the conditional binding for access/delete.)
4. Cost: Secret Manager bills per active secret version and per access; resolved keys are cached in memory for 5 minutes per instance.
5. Index: deploy `firestore:indexes` – the sweeper needs the `creditReservations (status, expiresAt)` collection-group index.
6. Admin grants: give your own account the admin claim once with the Admin SDK (`getAuth().setCustomUserClaims(uid, { admin: true })`), then call `adminGrantCredits`.
7. Research (Phase 3): set a Firestore **TTL policy** on collection group `researchItems`, field `expireAt` (Console → Firestore → Time-to-live) so dedupe memory is deleted after 30 days. Without it nothing breaks, the collection just grows.
8. ⚠️ Web search uses Gemini Google Search grounding, billed per query (`GROUNDING_COST_MICRO_USD_PER_QUERY` in `pricing.ts` is a placeholder) and its availability/pricing must be verified for the project. Research fetches third-party pages from Cloud Functions: `safe-fetch.ts` blocks private/metadata addresses; never loosen it, and `RESEARCH_ALLOW_LOCALHOST` must never be set outside the emulator test project.
9. ⚠️ Prices in `functions/src/ai-core/pricing.ts` and model ids in `registry.ts` are placeholders – verify against the official Gemini/OpenAI pages and bump `PRICE_VERSION` before charging anyone.

Logs:
```bash
firebase functions:log
firebase functions:log --only checkScheduledPosts
```
or Console → Functions → pick function → Logs.

Delete a function that no longer exists in code: `firebase functions:delete <name>`.

## 8. Frontend

```bash
npm run lint
npm run build          # must pass before every deploy
```
Deploy to your host (Vercel/other) from `prod-v3`. Set env vars there (§3). After first deploy:
1. Add the domain to Firebase Auth → Settings → **Authorized domains**.
2. Update LinkedIn/Reddit redirect URIs to the prod domain.
3. Set `REDDIT_REDIRECT_URI`/`LINKEDIN_REDIRECT_URI` in `functions/.env` and redeploy functions.

## 9. Local development / emulators

```bash
# terminal 1 (functions folder)
firebase emulators:start          # auth 9099, functions 5001, firestore 8080, storage 9199, UI 4000
# terminal 2 (root)
npm run dev
```
Point `NEXT_PUBLIC_API_URL` at `http://127.0.0.1:5001/linkedloom/us-central1` while using emulators.

### Tests (functions folder)

```bash
npm test             # 135 unit tests (persona validation, pricing, redaction, SSRF guard, research, schedule math, workflow logic), no emulator needed
npm run test:rules   # Firestore rules tests in the emulator (needs Java)
npm run test:e2e     # builds, then 75 tests in auth+firestore+functions (+Cloud Tasks) emulators: callables, credits ledger, research, scheduling, durability
```
`test:e2e` runs on the offline project `demo-linkedloom-test`; `functions/.env.demo-linkedloom-test` switches AI providers to a deterministic mock (no real AI calls, no keys needed) and lowers the editor daily cap to 3 so the cap can be tested.
Windows gotcha: after `emulators:exec` finishes, the Firestore emulator (a `java` process on port 8080) sometimes keeps running, and the next run fails with "port taken". Find it with `Get-NetTCPConnection -LocalPort 8080 -State Listen` and stop that `java` process.

## 10. Release checklist (copy/paste)

```text
[ ] git status clean, on prod-v3, merged from dev
[ ] npm run lint && npm run build          (root)
[ ] cd functions && npm run build
[ ] functions/.env has all prod values (§3), redirect URIs = prod URLs
[ ] firebase deploy --only firestore:rules,firestore:indexes,storage
[ ] firebase deploy --only functions
[ ] deploy frontend, env vars set on host
[ ] smoke test: login, create post, schedule, connect LinkedIn, connect Reddit, disconnect Reddit
[ ] check function logs for errors
```

## 11. Knowledge graph (optional)

`graphify-out/` is generated locally and is gitignored. Rebuild after big changes: `/graphify . --update` in Claude Code.

## 12. Related docs

- `README.md` – overview
- `docs/reddit-integration/` – Reddit setup + policy compliance
- `docs/ai-autopilot/` – AI Autopilot architecture, MVP plan and milestones
- `PRODUCTION_READINESS_CHECKLIST.md` – launch blockers and status
- `AGENT.md` – codebase map for AI assistants
