# LinkedLoom – next plans

Plans that are agreed but **not started**. Each section is self-contained; move it out (or delete it) once it ships.

| # | Plan | Status | Agreed |
|---|---|---|---|
| 1 | [Multiple workspaces per user](#1-multiple-workspaces-per-user-one-per-productbrand) | not started – do before billing (A6) | 2026-10-27 |

---

## 1. Multiple workspaces per user (one per product/brand)

### Context
Today every user has exactly one workspace and its id *is* their uid (`workspaces/{uid}`). The owner runs several products (e.g. Kryvex, LinkedLoom) and wants a separate workspace for each, each with its own Autopilot.

**Is it a good idea? Yes, and it is cheaper than it looks for Autopilot,** because personas, drafts, runs, AI keys, credits and company-context files already live under `workspaces/{id}/…`, and the Firestore rules already authorise through `isWorkspaceMember` + `members/{uid}`. The cost sits in four places that were built around "workspace = uid": (1) every callable calls `ensureWorkspace(uid)` and never accepts a workspace id (~28 call sites), (2) the `posts` collection and its rules/queries are per user, (3) free trial credits and editor daily caps are granted per workspace (so extra workspaces would mint free usage), (4) the client uses `user.uid` as the workspace id in ~40 files. Real value: separate brand voices, sources, keys, drafts and calendars; a clear mental model. Main risk: it touches publishing paths, so migration and tests matter.

**Owner decisions:** everything workspace-specific (Autopilot, Content Studio drafts, Content Library, Calendar, Analytics) · trial credits **once per user** · **max 5 workspaces**, owner-only (no teammates/invites) · LinkedIn: **one shared login for all workspaces now; "post as profile or page" per workspace later** (pages need LinkedIn's Community Management API approval, not available to a normal app) · owner does all git, no commits/pushes; tests are written and run per the owner's instructions.

### Design

#### 1. Model
- `workspaces/{id}` gets `{ name, ownerId, type: "personal" | "project", status: "active" | "archived" }`. The existing workspace keeps id = uid (`type: "personal"`, name defaults to "Personal workspace", renamable). New workspaces use a Firestore auto-id. `members/{uid}` (role `owner`) already exists for each; no role/invite logic.
- **Listing:** callable `listWorkspaces` runs `collectionGroup("members").where("uid","==",uid)` (add a collection-group field override for `members.uid` in `functions/firestore.indexes.json`, like the existing `personas.research.autoRun` one), loads the workspace docs, and **creates the personal workspace if the user has none** (reuses `ensureWorkspace`). Clients cannot list workspaces themselves (rules deny it), so this callable is the only source.
- New callables (new file `functions/src/autopilot/workspaces.ts`, exported from `index.ts`): `listWorkspaces`, `createWorkspace {name}`, `renameWorkspace {workspaceId,name}`, `archiveWorkspace {workspaceId}`, `restoreWorkspace`. Limits: ≤5 **active** owned workspaces (checked in the create transaction), name 1–60 chars. **Archive, not delete** (hard delete would cascade through ~17 subcollections and Secret Manager secrets – out of scope). Archive is refused while the workspace has queued/publishing posts ("unschedule or publish them first"), turns its Autopilot kill switch off, and hides it from the switcher; archived workspaces are read-only (writes via callables are rejected).

#### 2. Server: every callable takes a workspace
- `functions/src/shared/callable.ts`: add `workspaceRequest(request, schema)` → `{ uid, workspaceId, input }`: strips an optional `workspaceId` from `request.data` **before** zod parsing (so the many `.strict()` schemas stay unchanged), then calls `resolveWorkspace(uid, workspaceId)`.
- `functions/src/autopilot/workspace.ts`: add `resolveWorkspace(uid, requestedId?)`. No id → the personal workspace (`ensureWorkspace(uid)`, exactly today's behaviour, so old clients and the existing e2e tests keep working). With an id → the workspace must exist, the caller must have `members/{uid}`, and it must be active; otherwise `not-found`/`permission-denied` (don't reveal existence). Also add `createWorkspaceDoc`.
- Replace the `requireUid → parse → ensureWorkspace(uid)` trio with `workspaceRequest` in: `autopilot/personas.ts`, `autopilot/research/run.ts`, `autopilot/approval/approve.ts` (`previewApproval`, `approveContent`, `unscheduleContent`), `autopilot/context/callables.ts`, `autopilot/demo.ts`, `autopilot/test-generate.ts`, `ai-core/connections.ts`, `ai.ts` (`generatePost`, `generateImage`, `enhanceImagePrompt`). Run-by-id callables (`retryRun`, `cancelRun`, `updateContentItem`, `setContentStatus`, `exportContentToDraft`, `deleteContextDoc`) are scoped only by the membership-checked workspace, so that check is their isolation – covered by tests.
- Publishing callables (`functions/src/publishing/callables.ts`): `publishNow` accepts `workspaceId` for new posts; existing-post paths use `post.workspaceId ?? post.user_id`. Fix `writeAudit(uid, uid, …)` (lines ~151/180) to audit into the post's workspace. `functions/src/publishing/publish-post.ts` already mirrors via `post.workspaceId ?? post.user_id` – keep that fallback.
- Background jobs (dispatcher, reaper, sweeper, schedule index, Cloud Tasks payloads) are already keyed by `workspaceId` read from docs/paths – **no change**. Reconcile/scale limits (500/200/100 per tick) noted, not changed.
- The scheduled-run actor stays `persona.createdBy` (single owner per workspace).

#### 3. Credits and caps (stop free-usage multiplication)
- **Trial once per user:** `ensureWorkspace`/`createWorkspaceDoc` create the wallet in a transaction that also reads a **server-only** marker `trialGrants/{uid}` (top-level, denied to clients by the catch-all rule). First wallet for the user → `TRIAL_CREDITS` + marker; later workspaces → wallet with 0 balance (no `trial-grant` ledger entry). For the existing personal workspace (wallet already exists) the marker is back-filled without granting anything.
- **Editor caps per user:** add `consumeUserDailyQuota(uid, bucket, cap, msg)` in `functions/src/ai-core/usage.ts` (top-level `userUsageCounters/{uid}_{bucket}_{day}`); `RunContext.dailyCap` gets `perUser?: true` (`ai-core/execute.ts:116`) and `generatePost`/`enhanceImagePrompt` use it; `ai.ts:83` (`generateImage`) switches to it. `autopilot.run`, `autopilot.demo` and `byok` stay per workspace (they spend that workspace's credits/keys, and ≤5 workspaces bounds it).
- New workspaces start with 0 credits: the "New workspace" dialog says so and points to **AI keys** (BYOK is per workspace, so each workspace needs its own key – a shared user-level key store is a follow-up).

#### 4. Posts become workspace-scoped
- Every post carries `workspaceId`. Writers: editor/client writes (`lib/firebase/posts.ts` `createPost`), `publishNow` create path, `exportContentToDraft` (also add `personaId`), `approveContentInternal` (already sets it). `occupiedSlots` (`approval/approve.ts:39`) filters by `workspaceId` instead of `user_id` (new composite index `(workspaceId, scheduledFor)`); slots are therefore independent per workspace (two workspaces sharing one LinkedIn profile could pick the same window – accepted, documented).
- **Rules (`functions/firestore.rules`, posts):** `workspaceId` may be set on **create** by the client only if it is a workspace the caller is a member of (`isWorkspaceMember(request.resource.data.workspaceId)`), and is immutable on update (keep it in the update-forbidden list). Read/update/delete stay owner-only by `user_id` (workspaces are single-owner). Create without `workspaceId` stays allowed (old frontend during rollout), but the new frontend always sends it.
- **Migration, lazy and self-service:** `listWorkspaces` runs once per user (flag `postsBackfilledAt` on the personal workspace doc) and, with the Admin SDK in batches ≤400, sets `workspaceId = uid` on the user's posts that lack it (clients can't write it for legacy docs). Legacy exports/manual/old autopilot posts therefore land in the Personal workspace.
- Client queries: `getAllPosts(workspaceId)` filters `user_id == uid && workspaceId == id` (two equality filters need no composite index); analytics aggregates the same set.

#### 5. LinkedIn / Reddit (deliberately unchanged now)
- The LinkedIn login/connection stays **user-level** (`users/{uid}/connections/linkedin`, `linkedinIdentities`, OAuth state): one account, shared by all workspaces, so nothing in the OAuth/identity flow changes. UI copy on Connections becomes "LinkedIn account (shared by all your workspaces)".
- **Later (not in this change):** a per-workspace setting `workspaces/{id}/settings/publishing { linkedinAuthor: {type: "person"|"organization", urn, name} }` and `publishToLinkedInInternal(..., authorUrn)`; page posting needs `w_organization_social` + review. No schema work needed now beyond keeping posts workspace-scoped.
- Reddit is on hold and stays user-level.

#### 6. Client
- **`WorkspaceProvider`** (`components/providers/workspace-provider.tsx`), mounted in `app/(dashboard)/layout.tsx` between `AuthProvider` and `Shell` (AuthProvider already blocks children until the user/profile exist). It calls `listWorkspaces` through TanStack Query (`queryKeys.workspaces.list(uid)`), keeps the selected id in state initialised lazily from `localStorage["linkedloom.workspace.<uid>"]` (validated against the list, falling back to the personal workspace; lazy init avoids the repo's `react-hooks/set-state-in-effect` lint rule), and exposes `useWorkspace()` → `{ workspaces, workspace, workspaceId, setWorkspaceId, isLoading }`. Shows a skeleton while loading and a retry state on error.
- **Switcher:** replace the static "My Workspace" card at `components/layout/Sidebar.tsx:50-57` (rendered in both the desktop sidebar and the mobile sheet) with `WorkspaceSwitcher` built on the existing `dropdown-menu`: workspaces with a check mark, "New workspace…" (dialog: name; shows the 5-limit and the "0 credits, add an AI key" note), "Rename…", "Archive…". `Shell.tsx:85` breadcrumb shows the active workspace name instead of the word "Workspace". On switch: close dialogs, clear the global `localStorage["draft_post"]`, and if the route is a persona detail page (`/autopilot/[personaId]`) go to `/autopilot`.
- **Data hooks read the workspace themselves:** workspace-scoped hooks in `lib/query/hooks/{use-autopilot,use-research,use-context,use-ai-billing,use-publishing,use-posts,use-analytics}.ts` call `useWorkspace()` internally (dropping the `userId` parameter) so query keys and callable payloads both use the workspace id; `lib/firebase/{autopilot,ai,research,context,publishing,posts,analytics}.ts` take `workspaceId` and send it in callable payloads / build `workspaces/${workspaceId}/…` paths. `tsc` finds every call site (pages under `app/(dashboard)/autopilot/**`, `components/features/{autopilot,dashboard,publishing,editor,scheduler,analytics}`, dashboard/calendar/schedule pages). Keys that lack an id today (`useApprovalPreview`, `posts.detail`) get the workspace id added. Editor `createBasePayload` sends `workspaceId`.
- `useCreatePost` currently invalidates with `variables.user_id`; change it to the workspace id so invalidation does not silently miss.
- Copy fixes: Connections/Billing "workspace" wording, "KillSwitch" text uses the workspace name.

### Order of work
1. Backend foundation: workspace doc shape, `resolveWorkspace`/`workspaceRequest`, workspace callables, trial marker, per-user editor caps, indexes, rules (posts + members index).
2. Convert the callables (mechanical), publishing audit fix, posts writers (`workspaceId`), `occupiedSlots`.
3. Lazy posts backfill inside `listWorkspaces`.
4. Client: provider, switcher, hooks/wrappers, pages, copy.
5. Tests, docs (`HANDOFF.md`, `DEPLOYMENT.md`, `AGENT.md`), deploy notes.

### Critical files
Server: `functions/src/autopilot/workspace.ts`, `functions/src/shared/callable.ts`, new `functions/src/autopilot/workspaces.ts`, `autopilot/{personas,demo,test-generate}.ts`, `autopilot/research/run.ts`, `autopilot/approval/approve.ts`, `autopilot/context/callables.ts`, `ai-core/{connections,usage,execute}.ts`, `ai.ts`, `publishing/callables.ts`, `functions/firestore.rules`, `functions/firestore.indexes.json`, `functions/src/autopilot/types.ts` (Workspace type, audit actions `workspace.create|rename|archive`).
Client: `components/providers/workspace-provider.tsx` (new), `components/layout/{Sidebar,Shell}.tsx`, `app/(dashboard)/layout.tsx`, `lib/query/query-keys.ts`, `lib/query/hooks/*`, `lib/firebase/*`, `types/*`, autopilot/dashboard/calendar/schedule/analytics pages and components.
Reuse: `ensureWorkspace` (personal workspace + wallet), `isWorkspaceMember` + `members/{uid}` in the rules, `consumeDailyQuota` pattern, `workspaceRef/personasRef` helpers, `dropdown-menu`/`dialog` UI components, the `adminDispatchResearch`-style callable conventions, collection-group override pattern in `firestore.indexes.json`.

### Verification
- `cd functions && npm run build && npm test` (add unit tests for `workspaceRequest` id stripping/validation); root `npx tsc --noEmit` and scoped ESLint (no new `set-state-in-effect`).
- New in-process test `functions/test/workspaces.process.test.ts` (Firestore emulator): create/list/rename/archive, 5-workspace limit, membership isolation (another user's workspace id → denied for every callable family incl. run-by-id), trial credits only on the first workspace and a back-filled marker for the legacy one, archive blocked by queued posts, legacy posts back-filled into the personal workspace, per-user editor cap shared across workspaces.
- Extend `functions/test/rules.test.ts` (post create with a member/non-member `workspaceId`, immutable `workspaceId`, members readable, new collections denied) and keep the existing e2e suites green – they call callables without `workspaceId`, which must still resolve to the personal workspace.
- Manual: create "Kryvex" next to the legacy workspace → personas, drafts, runs, AI keys, credits (0), context files, Content Library, Calendar and Analytics show only the selected workspace; switch persists across reload; persona detail redirects on switch; existing user sees all old data in "Personal workspace"; scheduling in two workspaces keeps posts separate.
- Deploy order: rules + indexes (index build takes minutes) → functions → frontend. Old frontends keep working (no `workspaceId` ⇒ personal workspace).

### Out of scope
Teammates/invites/roles · hard delete of workspaces · per-workspace LinkedIn tokens or posting as a LinkedIn Page (needs LinkedIn approval; data model keeps the door open) · per-workspace Reddit · per-workspace storage paths · a user-level shared AI-key store · changing scheduler batch limits.
