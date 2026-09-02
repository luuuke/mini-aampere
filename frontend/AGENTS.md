<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend guidance

Build the frontend as a clear, polished B2B auction dashboard using Next.js and TypeScript.

## Architecture

- Use the Next.js App Router.
- Use TanStack Query for client-side server state.
- Keep API access in dedicated modules within the owning feature; do not scatter `fetch` calls across UI components.
- Centralize query keys and invalidate affected queries after mutations.
- Do not duplicate server state into local/global state unless necessary.

## Code organization

- Organize application code by business feature or vertical slice, not primarily by technical layer.
- Each feature should own its API access, domain types, components, validation, and tests where applicable.
- Keep App Router route and layout files thin and use them mainly to compose feature code.
- Place code in shared `components`, `lib`, or utility directories only when it is genuinely reused across multiple features.
- Avoid broad global folders such as `services`, `types`, or `hooks` when their contents belong to one feature.

## Auction rules

- Dealer-facing UI must never expose or infer:
  - reserve price
  - other dealers' bid amounts
  - highest bid
  - admin-only auction information

- Treat backend auction status, permissions, and bid validation as authoritative.
- Frontend validation is for UX only.
- Use separate dealer/admin API types where their available data differs.
- Treat backend timestamps as authoritative.
- Countdown timers should update locally and must not trigger API requests every second.

## Data states

Every data-driven view should handle loading, error, and empty states clearly.

## Verification

- In Codex, run production build checks with `npm run build -- --webpack`. Do not run the bare
  `npm run build` command: its default Turbopack path attempts to bind an internal port while
  processing CSS and fails in the sandbox with `Operation not permitted`.
- Treat a successful webpack production build as the frontend build verification. Do not retry or
  escalate the known Turbopack sandbox failure.

## Forms

- Show inline validation and backend submission errors clearly.
- Prevent duplicate submissions while a mutation is pending.
- Do not duplicate complex backend business rules in frontend validation.

## Design

Use a restrained Aampere-inspired B2B aesthetic.

### Palette

- Primary: `#2DBE8A`
- Text: `#171A18`
- Muted text: `#66706B`
- Background: `#F7F8F6`
- Surface: `#FFFFFF`
- Border: `#E4E8E5`

Use brand green primarily for actions, active states, and highlights. Avoid large green surfaces.

### Visual style

- Prefer white cards, thin borders, 8–12px radii, and minimal shadows.
- Make vehicle imagery prominent.
- Keep countdowns visible without flashing or casino-style effects.
- Avoid gradients, glassmorphism, excessive shadows, neon EV aesthetics, and unnecessary animation.

## Auction page hierarchy

Prioritize:

1. Vehicle identity
2. Auction status and countdown
3. Dealer's own current bid
4. Primary bid action
5. Vehicle specifications and secondary details
