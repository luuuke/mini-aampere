# Project guidance

Build a simplified dealer platform for blind, sealed-bid vehicle auctions.

## Repository layout

- `backend/` — NestJS API and database implementation.
- `frontend/` — React/Next.js application.

Follow any more specific `AGENTS.md` files inside these directories.

## Core rules

- Keep the solution well-scoped, understandable, and easy to explain.
- Preserve the blind-auction rules: dealers must never receive other dealers’ bid amounts or the reserve price.
- Enforce auction timing, authorization, and bid validation on the backend.
- Prefer small, reviewable changes and avoid unrelated modifications.
- Before finishing, run the relevant tests, lint, build checks, and run applicable smoke tests. Report
  anything that could not be verified.

## Commits

When creating commits, use Conventional Commits:

`<type>(<optional scope>): <description>`

Common types: `feat`, `fix`, `test`, `docs`, `refactor`, and `chore`.

Examples:

- `feat(backend): add dealer bid validation`
- `fix(frontend): handle expired auction countdown`
- `test(backend): cover winner selection`
