# AGENTS.md — LinkedLoom (instructions for coding agents)

Private SaaS (Next.js 16 + Firebase). Code map: [`AGENT.md`](AGENT.md). Deploy/ops: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Launch blockers: [`PRODUCTION_READINESS_CHECKLIST.md`](PRODUCTION_READINESS_CHECKLIST.md).

## Resuming the AI Autopilot feature (in progress)

**Start with [`docs/ai-autopilot/HANDOFF.md`](docs/ai-autopilot/HANDOFF.md)** – it states exactly where the last session stopped, the immediate TODO (A4 frontend), commands, gotchas and decisions. (`docs/ai-autopilot/` and `docs/reddit-integration/` are local, gitignored planning folders; they exist on the owner's machine.)

Short version: phases A1–A3 and the **backend of A4** (scheduled + durable research via Cloud Tasks) are built and tested in emulators with mocked AI. The **A4 frontend is not done**, and the existing "Run research" dialog is out of sync with the now-async `runResearch` callable. Nothing is committed or deployed.

## Rules

1. **Never run `git commit`, `git push`, or create/switch branches.** The owner does all git. Read-only git commands are fine.
2. **No AI attribution lines** (no "Co-Authored-By: …") in commits, PRs or any other output.
3. **Graph-first navigation**: for "where does X live / what calls Y" questions, check `graphify-out/graph.json` first (`graphify query|explain|path`), then verify in the live code before editing (the graph may be stale).
4. Scope guardrails: Autopilot is **LinkedIn-only with manual approval**; **Reddit is on hold**; never loosen `functions/src/autopilot/research/safe-fetch.ts` (SSRF guard); keep heavy SDKs lazy-loaded in `functions/`.
5. Windows/PowerShell: wrap string concatenations in parentheses when building arrays of replacement pairs (`+` binds looser than `,`); prefer the editor tools for multi-line edits.

## Verify your work (from `functions/`)

```bash
npm run build && npm test          # 135 unit tests
npm run test:rules                 # 10 rules tests (needs Java)
npm run test:e2e                   # 78 emulator tests, mocked AI (~10 min)
# repo root:
npx tsc --noEmit
```
On Windows a leftover Firestore emulator (`java` on port 8080) can block the next run – stop it first.
