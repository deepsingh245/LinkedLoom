# Design System: LinkedLoom — AI Autopilot V2

> Google Stitch redesign specification. Apply to the **existing Stitch project** and regenerate its screens for responsive web and mobile. This is a product redesign, not a landing-page exercise.

## 1. Product intent and redesign mandate
LinkedLoom is an AI-powered social media operations platform for creators, founders, and professionals. It already supports AI-assisted content creation, editing, scheduling, publishing, and analytics, with LinkedIn as a foundational channel. Its next evolution is **AI Autopilot**: persistent workspace personas research web/RSS sources, assess relevance and verify sources, draft platform-specific posts and optional media, send content for approval, and publish through connected accounts when authorized.

Do not cosmetically reskin the existing Stitch design. Audit its existing information architecture and retain useful workflows, but reconstruct the visual hierarchy and interaction patterns around the new autopilot lifecycle. Design both desktop web and mobile, including meaningful differences in navigation and information density. Do not imply that planned features are already shipped.

Core workflow: **Discover → Verify → Draft → Review → Queue → Publish → Learn**. Research and publishing operate on separate schedules. Approval is the default; autonomous publishing requires explicit opt-in. A prominent pause/kill switch and transparent activity log are essential.

## 2. Visual theme and atmosphere
A confident, calm, editorial operations console with the clarity of a professional productivity app and the craft of a modern creative tool. Visually suggest an intelligent system working quietly in the background, not a chatbot with an attached calendar. Avoid sci-fi and cyberpunk tropes.

- Desktop density **6/10**, mobile **4/10**; variance **6/10** (asymmetric yet organized); motion **5/10** (purposeful, not distracting).
- Crisp neutral surfaces, generous whitespace around important decisions, compact rows for operational data, deliberate typography, thin dividers, subtle contextual elevation.
- Active AI status is unmistakable but never alarmist. Human oversight is visible and easy to exercise.
- Distinguish **autopilot system state** from **individual post state**. Do not conflate draft, pending approval, scheduled, published, failed, and paused.

## 3. Color palette and roles
Use one consistent cool-zinc neutral family and **one chromatic accent**. Functional status colors may be used sparingly only for semantic feedback, not as competing brand accents.

| Token | Value | Purpose |
|---|---|---|
| Canvas | `#F7F8FA` | Main light-mode workspace background |
| Surface | `#FFFFFF` | Primary panels, dialogs, sheets |
| Surface Subtle | `#F0F2F4` | Hover surfaces, secondary regions |
| Ink | `#20242B` | Main headings and body text |
| Ink Muted | `#67717C` | Secondary labels, supporting copy |
| Border | `#E2E6EA` | 1px separators, input outlines |
| Loom Teal | `#357D72` | **Only brand accent**: primary CTAs, active navigation, focus |
| Teal Wash | `#E8F3F0` | Accent-tinted selected/active surfaces |
| Dark Canvas | `#14191D` | Optional dark-mode canvas |
| Dark Surface | `#1D2429` | Optional dark-mode panels |
| Dark Ink | `#F1F4F5` | Dark-mode primary text |
| Dark Border | `#354047` | Dark-mode separators |

Semantic status: use text + icon + subtle tint, not color alone. Pending approval is neutral/attention-worthy; published is successful; failed requires clear recovery; paused is visibly inactive. Avoid making every status a saturated badge.

Never use purple, electric blue, neon glow, glossy gradients, or pure black. Preserve accessibility contrast; verify WCAG AA for text and controls.

## 4. Typography
- Display and UI headings: **Satoshi**, fallback **Geist**, sans-serif. Tight tracking (`-0.025em`) and weight 600–700.
- Body and interface: **Geist**, 400–500; desktop body 14–16px, mobile body 15–16px, line-height 1.45–1.6.
- Metrics, timestamps, automation runs, quotas: **Geist Mono**, tabular numerals.
- Desktop page title: 30–36px; mobile title: 25–29px. Section headings 18–22px. Small metadata 12–13px where nonessential; readable interactive labels at least 14px.
- Body copy maximum 65ch where paragraphs appear. Avoid all-caps paragraphs and oversized metric numerals.
- No Inter, generic serif fonts, decorative script, or serif fonts in the app.

## 5. Layout and responsive system
- Desktop: persistent left navigation rail/sidebar 232–256px; content max width 1440px; flexible 12-column grid; 24–32px content gutters; contextual right inspector 320–360px only when useful.
- Tablet: compact rail and 16–24px gutters; inspector becomes a drawer.
- Mobile (<768px): native-feeling single-column flow, 16px gutters, top context header, bottom navigation for **Home, Autopilot, Create, Calendar, Inbox** (adapt if labels overflow); secondary destinations in a More menu. Use bottom sheets for filters and actions.
- Mobile must not be a shrunken desktop dashboard. Prioritize one decision per viewport; cards become stacked modules, timelines become vertical, tables become drill-down lists.
- Use an 8px spacing rhythm with 4px refinements. Control heights 40–44px desktop, at least 44px mobile. No horizontal page overflow. Respect device safe areas.
- Radius: controls 10–12px; operational panels 14–16px; featured summary surfaces 18–20px. Avoid universal pill-shaped cards.
- No overlapping interface elements or floating decorative objects obscuring content.

## 6. Information architecture
Primary desktop navigation:
1. **Overview** — concise daily briefing and what needs action.
2. **Autopilot** — persona status, goals, sources, research/publishing schedules, active runs, controls.
3. **Research** — discovered ideas, verified sources, relevance and provenance.
4. **Content Studio** — AI-generated drafts, editing, variants, media, platform previews.
5. **Approval Inbox** — review queue, approve, reject, request revision, bulk actions with safeguards.
6. **Calendar & Queue** — schedule visualization, queue ordering, conflicts, rescheduling.
7. **Analytics** — performance and learning signals; show data availability clearly.
8. **Connections** — connected platforms, OAuth status, permissions, reconnection.
9. **Settings & Billing** — workspace, AI provider settings, managed credits/BYOK, budgets, publishing permissions, notifications.

Workspace switcher and account access sit at the top/bottom of navigation respectively. Clearly label unimplemented or unavailable functionality rather than inventing live data.

## 7. Signature screen compositions

### A. Desktop Overview — command center
Left-aligned heading **Your content, in motion.** with date and workspace context. Top-right compact system status and one primary CTA **Review drafts** when approvals exist, otherwise **Create post**. Below, a dominant **Autopilot Pulse** panel (approx. 7 columns) with current mode, last run, next research run, next publishing run, progress and pause control. Alongside, a narrower **Needs your attention** panel (5 columns) showing pending approvals and failed tasks. Below: editorial list of upcoming posts and compact recent activity timeline. Analytics appears as a modest secondary strip, not giant decorative cards. Every metric is grounded in actual data or clearly marked as sample.

### B. Autopilot workspace
A purpose-built control room, not a chatbot. Header: persona name, connected accounts, active/paused state, primary **Pause autopilot** action. Main area: vertical lifecycle tracker **Researching / Verifying / Drafting / Awaiting approval / Scheduled / Published** with run history and expandable evidence. Side panel: editable goals, content pillars, source lists, tone, research cadence, publishing cadence, and approval mode. Separate **Run research now** from **Generate drafts**. Autopublish toggle is OFF by default, requires confirmation and explains scope. Pause control always visible.

### C. Research intelligence
Dense, elegant editorial feed with topic/title, source domain, publication time, why relevant, confidence/evidence, and clear **Turn into draft** action. Show source links and freshness. Filters: topic, source, status, channel. Never invent citations or fabricate verification.

### D. Content Studio
Two-pane desktop composition: left editor (headline/hook, body, media, AI refinement actions), right authentic platform preview with character/asset validation. Platform variants in tabs. Bottom or top persistent actions: **Save draft**, **Send for approval**, **Schedule**. AI assistant appears as a contextual panel, not a full-screen chat takeover. Mobile uses editor-first view and a preview toggle or sheet.

### E. Approval Inbox
A decision-centric split view: queue list at left, full post preview and evidence at right. Approve, request changes, reject, and schedule are visually distinct. Include source provenance, generated timestamp, destination account, proposed publish time, and policy/risk notices where available. Mobile presents one review item at a time with sticky bottom action bar.

### F. Calendar and Queue
Desktop: month/week toggle plus a chronological queue list; channel filters and visible statuses. Mobile: compact date strip and agenda list, not a compressed month grid. Show timezone, reschedule controls, empty slots, and publishing failures. Drag-and-drop on desktop must have keyboard and menu alternatives.

### G. Analytics
Measured, readable line/bar visualizations, date filters, channel selection, and post-level breakdowns. Explain what each metric means and what data source supports it. Separate actionable insights from speculation. No invented growth numbers or fabricated success rates.

### H. Mobile Home and Autopilot
Mobile Home opens with an actionable daily briefing: autopilot status, **3 most urgent items** if present, next queued post, and recent run summary. Mobile Autopilot emphasizes pause/resume, approval mode, next runs, and a vertically stacked activity feed. Details expand in sheets. Keep bottom navigation persistent where appropriate.

## 8. Components and interaction states
- **Primary button:** Loom Teal fill, white text, 10–12px radius, 44px min height, subtle pressed translateY(1px). Only one primary action per decision region.
- **Secondary:** neutral surface, 1px border; tertiary as text/ghost action.
- **Operational rows:** 1px separators, compact metadata, obvious click targets. Prefer rows over excessive floating cards.
- **Featured panels:** soft background-matched shadow and subtle border; reserve elevation for priority and layered surfaces.
- **Inputs:** visible labels above, helper copy beneath when necessary, inline errors below; focus ring in muted teal. Never rely on placeholders as labels.
- **Status chip:** icon + text, 8px radius, subtle tint; clear language such as `Awaiting approval`, `Scheduled`, `Failed`, `Paused`.
- **Activity timeline:** timestamp, actor (AI/user/system), stage, outcome, linked detail. Show retries and failures without hiding them.
- **AI execution panel:** concise step progress, expandable reasoning summary/evidence, cancel or pause where supported. Never expose fabricated chain-of-thought or unverified research.
- **Skeleton loading:** mimic actual rows and panels; no generic spinners dominating the interface.
- **Empty state:** informative, task-specific explanation and one next action, with restrained custom line art if useful.
- **Error state:** explain failure and actionable recovery, preserve work. Include disconnected accounts, expired OAuth, missing permission, failed publish, quota reached, missing AI key, no research sources, and offline states.
- **Confirmation:** high-impact actions (autopublish enable, bulk publish, disconnect, delete) show consequences and require deliberate confirmation.

## 9. Motion and behavior
- Standard interactions 140–220ms, ease-out; panel transitions 220–320ms. Optional spring equivalent stiffness 100, damping 20.
- Stagger list entrance sparingly (20–35ms between items) only on first reveal. Avoid reanimating long feeds on every update.
- Perpetual micro-motion only for genuinely running automation: subtle progress sweep or small pulsing indicator, not entire cards floating.
- Animate only opacity and transform where possible; no expensive blur loops or layout thrashing. Support `prefers-reduced-motion` by removing nonessential animation.
- AI states should feel live through truthful timestamps, streaming stage transitions, and accessible live-region announcements, never fake progress.

## 10. Content and microcopy
Tone: calm, clear, competent, reassuring, not boastful. Prefer **Research complete. 4 drafts ready to review.** over **Your AI has unleashed incredible content!** Prefer explicit controls: **Pause autopilot**, **Review 4 drafts**, **Reconnect LinkedIn**, **Retry publishing**. Explain what happens after approval or autopublish activation. Use realistic content examples only when explicitly labeled mock data.

## 11. Accessibility, trust and product safeguards
- WCAG AA contrast, visible keyboard focus, semantic headings, screen-reader names, keyboard-operable actions, 44px mobile targets.
- Never make approval or autopublish status ambiguous. Human approval is default. Enabling autonomous publishing must show destination accounts, allowed content scope, schedule, and ability to pause.
- Separate research schedule from publishing schedule. Show timezone and next execution for each.
- Surface verified sources, research timestamps, AI/provider usage and billing/credit boundaries without exposing API keys. BYOK secrets are masked.
- Provide clear data states for not-connected platforms and unsupported provider features.
- Respect platform identity and permissions. Do not imply X or other channels are connected until actually authorized.

## 12. Anti-patterns — NEVER DO
- No neon purple/blue AI look, outer glow, generic gradient hero, or fake glassmorphism.
- No Inter, generic serif typography, pure black, emojis as UI icons, or gimmicky 3D robot illustrations.
- No generic 3-equal-card feature rows, KPI overload, or identical rounded cards for every section.
- No center-aligned marketing hero inside the authenticated product.
- No giant chatbot replacing navigation or the approval workflow.
- No cluttered sidebars, floating controls covering content, or horizontal overflow on mobile.
- No fabricated metrics, source references, posts, success claims, or platform connection statuses.
- No decorative perpetual animation, custom cursors, bouncing arrows, or filler text.
- No vague copy such as `Elevate`, `Unleash`, `Next-gen`, `Seamless`.
- No unsafe one-click autopublish enablement without informed confirmation.

## 13. Google Stitch execution brief
**Instruction to Stitch:** You are editing an existing LinkedLoom project. Review the current screens for product functionality, then **replace the visual design system and reorganize the experience** using this file. Produce coherent high-fidelity screens, not a moodboard. Build paired desktop and mobile variants for Overview, Autopilot, Research, Content Studio, Approval Inbox, Calendar & Queue, Analytics, and Settings/Connections. Include default, loading, empty, error, running, paused, and approval-pending states where relevant. Reuse the same typography, palette, icon language, and component tokens across all screens. Make desktop operationally rich and mobile intentionally simplified. Do not silently remove existing supported publishing/scheduling functionality. Label planned capabilities as concept/prototype when appropriate.

**Review criteria:** (1) Is autopilot immediately understandable? (2) Is the next human action obvious? (3) Can the user pause automation instantly? (4) Can users trace a draft to its sources? (5) Is the publishing permission model unambiguous? (6) Is mobile independently usable? (7) Does it feel distinctive, polished, and calm rather than template-generated?
