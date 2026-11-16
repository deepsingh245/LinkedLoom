# LinkedLoom UI Design Handoff

Updated: 2026-10-20

## Read this first

This handoff covers the LinkedLoom UI and the design review. It is separate from the AI Autopilot engineering handoff at [`docs/ai-autopilot/HANDOFF.md`](ai-autopilot/HANDOFF.md). Before changing the app, read [`AGENTS.md`](../AGENTS.md), [`AGENT.md`](../AGENT.md), and [`DESIGN.md`](../DESIGN.md).

## User's current direction

- The user wants the full homepage and the rest of the product screens designed before implementation.
- A first-pass visual prototype has been made for review. The user has not yet approved implementing that design in the app.
- Treat future screen implementation as phased work and wait for the user's direction after they review the design.
- Never commit or push. The user handles Git commits.

## UI work carried forward

The preceding UI work in this task addressed these requests:

- Make the existing screens consistent with the teal light/dark theme, including sidebar hover and selected states.
- Keep Connections in Settings instead of duplicating it in Profile.
- Put the theme switch in the navbar with sun/moon icons.
- Use the sidebar for the account avatar and a navbar logout icon with a confirmation dialog.
- Bring dialogs and modals into the active theme.
- Simplify persona creation by pre-filling technical defaults and placing advanced controls behind Advanced settings; make publishing settings easy for users to find.
- Correct the persona form scroll behavior that moved the page unexpectedly near the bottom.
- Continue updating remaining screens to match the product's current visual direction.

These are a record of the preceding work and requests, not a claim that every state has been re-audited in this handoff. Verify the live source before revising any of them.

## Design prototype

The review artifact is a standalone HTML prototype outside the app repo:

`C:\Users\simra\.codex\visualizations\2026\10\15\01a14068-dd00-79f1-8a2a-32a9fe05a484\linkedloom-product-design\index.html`

It includes the marketing homepage and a page gallery for 24 screens: sign-in and registration; overview; Content Studio; Content Library; Calendar & Queue; Analytics; Autopilot Control Room; Persona Studio, create, and edit; research runs; Approval Inbox; AI keys; credits and usage; Profile; Preferences; Connections; Settings & Billing; Privacy and Terms; and LinkedIn/Reddit connection states. The prototype includes light/dark theme switching and sample content for review.

This artifact is a visual review prototype only. It has not been integrated into Next.js, and its sample content is not product data. The existing app's `DESIGN.md` is the source of truth for brand colors, type, spacing, layouts, and component behavior.

The earlier Figma design at `https://www.figma.com/design/Qdvr7OPu0NOF7E7nPKJjx5/Untitled?node-id=0-1` could not be inspected because the Figma connector had reached its Starter-plan call limit. The prototype therefore follows the repository's existing design tokens; compare it with Figma when access is available.

## Resume checklist

1. Review the prototype above and the actual current app screens side by side.
2. Collect the user's design feedback and agree on which phase to implement next.
3. For each approved phase, inspect the current implementation and preserve existing behavior, auth, data flow, and accessibility. Do not copy prototype fixture values into production.
4. Make changes in the repo only after the user moves from design review to implementation. Keep work uncommitted and unpushed.
5. Report which screens changed and what verification was run. Do not claim the prototype or source-only inspection is a visual validation of the implemented app.

## State at handoff

- No app code was changed and no tests were run in this turn.
- `firestore-debug.log` was already present in the workspace before this handoff was created; it was left untouched. Check its contents/ownership before cleaning it up.
- No commit or push was made.
