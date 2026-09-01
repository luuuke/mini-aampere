# Aampere frontend

Next.js App Router starter for the Aampere dealer auction platform. It includes TypeScript,
Tailwind CSS, TanStack Query, and shadcn/ui with Base UI primitives.

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The NestJS API is expected at
`NEXT_PUBLIC_API_URL` and defaults to `http://localhost:3000` in the example environment.

## Project structure

- `src/app/` — App Router layouts, pages, and the TanStack Query provider.
- `src/components/ui/` — shadcn/ui components owned by this project.
- `src/lib/` — shared frontend utilities.

Add more shadcn/ui components from this directory with:

```bash
npx shadcn@latest add <component>
```

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
