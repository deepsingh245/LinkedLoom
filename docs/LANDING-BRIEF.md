# Public pages: design brief

This is the brief behind the public pages: home (`/`), login (`/login`), register (`/register`) and the legal pages (`/privacy`, `/terms`). Use it as the prompt and review checklist whenever those pages change.

The product UI follows [`DESIGN.md`](../DESIGN.md). This brief applies the same system to the marketing surfaces.

**Where the code lives:**
- `components/landing/`: sections, `mockups/`, `SiteHeader`, `SiteFooter`.
- `components/auth/AuthParts.tsx`
- `app/(auth)/layout.tsx`
- `components/legal/LegalPage.tsx`
- The `.brand-surface` scope in `app/globals.css`.

## Role
You are a senior product designer and front-end engineer building LinkedLoom's public pages in Next.js App Router, Tailwind v4 and shadcn/ui.

## Product truth: never claim more than this
LinkedLoom helps professionals and founders run their LinkedIn presence.

**Available now:**
- AI post writer with tones
- Live LinkedIn preview
- Calendar and scheduler that publishes automatically
- Analytics
- AI images

**Early access: AI Autopilot.**
- Personas research the RSS feeds and websites you choose, plus optional web search.
- Sources are checked for freshness and minimum count, and near-duplicate ideas are dropped.
- Autopilot writes *sourced* drafts into an approval inbox.
- Approving a draft ("Approve & schedule") puts it in the next free posting slot. It is published to LinkedIn exactly once.
- Auto-publish is opt-in per persona, off by default, and must be confirmed.
- Controls: a stop-everything switch, per-persona pause, run logs and a monthly credit limit per persona.
- Runs on Gemini by default, or on your own Gemini or OpenAI key.

**Not supported, so never imply it:**
- LinkedIn is the only platform. Don't present X, Reddit or anything else as supported.
- No user counts, ratings, customer logos, testimonials or growth statistics until real ones exist.

## Audience and goal
Busy B2B professionals who want a consistent LinkedIn presence without giving up control.
- Primary action: **Start free** (`/register`).
- Secondary action: **See how it works**.

## Inspiration (patterns, not copies)
- **Linear:** the product UI is the hero; restrained copy; one section template repeated; precise microcopy (timestamps, statuses).
- **Supergrow and Taplio:** LinkedIn-specific framing; product mockups with realistic sample data; a FAQ that answers objections; the main call to action repeated at the hero, the middle and the end.
- **2026 landing-page trends:** show the real product early, clarity over decoration, motion only where it means something, simple navigation focused on conversion.

## Visual system
| Role | Value |
|---|---|
| Canvas / surface | `#F7F8FA` / `#FFFFFF` |
| Ink | `#20242B` |
| Muted ink | `#5F6A74` (darkened from `DESIGN.md` so it passes AA on canvas and teal wash) |
| Border | `#E2E6EA` |
| Accent (the only one) | Loom Teal `#357D72`; teal text uses `--teal-ink` `#2B6A60` for contrast |
| Teal wash | `#E8F3F0` |
| Dark mode | the app's existing `.dark` tokens; `.brand-surface` overrides the muted ink, teal ink and teal wash |

- **Type:**
  - Geist for display and UI: weight 600–700, `-0.025em` tracking on headings.
  - Geist Mono for timestamps and metadata.
  - Applied through `.brand-surface`. The dashboard is out of scope.
- **Layout:**
  - 8 px rhythm.
  - Radii: 10–12 px on controls, 14–16 px on panels, 18–20 px on featured surfaces.
  - 1 px borders and soft shadows that match the background.

## Hard nos
- Neon or glow; gradient headline text; glassmorphism.
- Pure black; purple or electric blue; Inter.
- Emojis as icons; custom cursors; bouncing arrows; perpetual decorative motion.
- Rows of three identical cards.
- Fabricated metrics or testimonials.
- The words "Elevate", "Unleash", "Next-gen", "Seamless", "Dominate".
- Dead `#` links.

## Structure
**Home**, in order:
1. Sticky header
2. Asymmetric hero with an approval-inbox mockup
3. Six-step Autopilot lifecycle strip
4. Three alternating "How it works" blocks: persona, sources, queue
5. "Available today" feature grid
6. "You stay in control" list
7. FAQ
8. Closing call to action
9. Footer

**Auth:** split layout. The form is on the left; on desktop only, a teal-wash panel on the right shows a compact draft mockup.

**Legal:** the shared header and footer around a single readable column.

## Copy
- Tone: calm, specific, reassuring. Prefer "Research complete. 4 drafts ready to review." over hype.
- Every mockup is labelled **Example**.
- Button labels match the app ("Approve & schedule", "Reject", "Pause autopilot").

## Motion
- Reveal on scroll: opacity and translate, about 320 ms ease-out. Content is only hidden when scripts can reveal it.
- One lifecycle highlight loop that steps through the stages.
- Both are switched off under `prefers-reduced-motion`.

## Quality bar
- WCAG AA in both themes.
- Visible focus rings, a skip link, mobile tap targets of at least 44 px.
- No horizontal overflow from 360 px to 1920 px.
- One H1 per page and semantic landmarks.
- The home page is a Server Component and pre-renders statically. Client components only for the header and mobile menu, and the scroll reveal.

## Review criteria
1. Can a visitor understand what LinkedLoom does within 5 seconds?
2. Is it obvious they stay in control?
3. Is every claim true today, or labelled Early access?
4. Does it look distinctive and crafted rather than template-made?
5. Does it feel like the same product as the app behind the login?
