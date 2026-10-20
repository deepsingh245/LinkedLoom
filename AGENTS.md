# AGENTS.md — LinkedLoom (instructions for coding agents)

Private SaaS (Next.js 16 + Firebase). Code map: [`AGENT.md`](AGENT.md). Deploy/ops: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Launch blockers: [`PRODUCTION_READINESS_CHECKLIST.md`](PRODUCTION_READINESS_CHECKLIST.md).

## Resuming the AI Autopilot feature (in progress)

**Start with [`docs/ai-autopilot/HANDOFF.md`](docs/ai-autopilot/HANDOFF.md)** – it states exactly where the last session stopped, the immediate TODO (A4 frontend), commands, gotchas and decisions. (`docs/ai-autopilot/` and `docs/reddit-integration/` are local, gitignored planning folders; they exist on the owner's machine.)

Short version: A1–A4 are built and tested in emulators with mocked AI. **A5** (approve → next free slot → exactly-once LinkedIn publishing, opt-in auto-publish, reconciliation, LinkedIn endpoint auth, per-post platforms) is **code complete but its rules/e2e suites have not been run yet** – see HANDOFF §13. Nothing is deployed.

## Rules

1. **Never run `git commit`, `git push`, or create/switch branches.** The owner does all git. Read-only git commands are fine.
2. **No AI attribution lines** (no "Co-Authored-By: …") in commits, PRs or any other output.
3. **Graph-first navigation**: for "where does X live / what calls Y" questions, check `graphify-out/graph.json` first (`graphify query|explain|path`), then verify in the live code before editing (the graph may be stale).
4. Scope guardrails: Autopilot is **LinkedIn-only**, manual approval by default (auto-publish is opt-in per persona, off by default); **Reddit is on hold**; never loosen `functions/src/autopilot/research/safe-fetch.ts` (SSRF guard); keep heavy SDKs lazy-loaded in `functions/`.
5. Windows/PowerShell: wrap string concatenations in parentheses when building arrays of replacement pairs (`+` binds looser than `,`); prefer the editor tools for multi-line edits.

## Verify your work (from `functions/`)

```bash
npm run build && npm test          # 153 unit tests
npm run test:rules                 # 11 rules tests (needs Java)
npm run test:e2e                   # 78 + A5 emulator tests, mocked AI (~12 min)
# repo root:
npx tsc --noEmit
```
On Windows a leftover Firestore emulator (`java` on port 8080) can block the next run – stop it first.
