# Project Instructions

<!-- BEGIN PROJSCAN v:3.0.2 date:2026-06-09 -->

## Project Overview

Waymark is a TypeScript mood-tracking and journaling app. The frontend is a React 19 + Vite app in `src/`; the backend is a Cloudflare Pages Functions API built with Hono in `functions/`. Data is stored in Cloudflare D1/SQLite via Drizzle ORM, with migrations in `drizzle/`.

Key entry points:

- `src/main.tsx` — React app bootstrap, router, Clerk provider, React Query provider.
- `src/App.tsx` — main route layout and protected dashboard routes.
- `src/services/api.ts` — frontend API client.
- `functions/api/[[route]].ts` — Cloudflare Pages Functions entry point.
- `functions/_shared/app.ts` — Hono app assembly, middleware, route registration.
- `functions/_shared/db/schema/` — Drizzle schema definitions.

## Tech Stack

- Runtime/package manager: Node.js with npm (`package-lock.json` present).
- Frontend: React 19, Vite 7, React Router 7, TanStack Query, Zustand, MDXEditor, Recharts, Lucide icons.
- Backend/API: Cloudflare Pages Functions, Hono, `@hono/zod-validator`, Hono rate limiter.
- Auth: Clerk plus legacy/local JWT flows.
- Database: Cloudflare D1/SQLite with Drizzle ORM and SQL migrations.
- Styling: Tailwind CSS v4 plus CSS files and utility helpers.
- Validation/testing: Zod, TypeScript, ESLint, Vitest, Miniflare/Wrangler.

## Key Directories

- `src/` — React frontend source.
- `src/components/` — UI and feature components (auth, fitness, goals, groups, history, mood, settings, stats).
- `src/views/` — route-level dashboard, settings, history, entry, goals, achievements, and informational views.
- `src/hooks/` — frontend data and preference hooks.
- `src/services/` — frontend API clients.
- `src/shared/schemas/` — shared Zod schemas used by frontend and backend.
- `functions/_shared/routes/` — Hono route modules for auth, mood, goals, groups, fitness, import, preferences, achievements, config, and misc endpoints.
- `functions/_shared/services/` — backend business logic and D1/Drizzle operations.
- `functions/_shared/middleware/` — auth, CORS, error handling, rate limiting, and security headers.
- `functions/_shared/db/schema/` — Drizzle table definitions and relations.
- `drizzle/` — D1/SQLite migration SQL and Drizzle metadata.
- `public/` — static public assets.
- `.pi/` and `.agents/` — local agent plans/extensions/skills; do not treat these as app runtime code.

## Quality Gates

Run these before reporting a code change as complete:

```bash
npm run typecheck
npm run lint
npm run test:hono
npm test
```

Additional useful commands:

```bash
npm run build                 # production frontend build
npm run pages:dev             # build then run Cloudflare Pages dev
npm run pages:deploy          # build then deploy Pages output
npm run db:generate           # generate Drizzle migrations
npm run db:migrate            # apply local D1 migrations
npm run db:migrate:remote     # apply remote D1 migrations
```

Projscan workflow recipes:

- Before editing: `projscan preflight --mode before_edit --format json` and `projscan workplan --mode before_edit --format json`.
- Bug hunt: `projscan bug-hunt --format json`, `projscan quality-scorecard --format json`, `projscan regression-plan --level focused --format json`.
- Pre-merge: `projscan preflight --mode before_merge --format json`, `projscan review --format json`, `projscan regression-plan --level smoke --format json`.

## Architecture Notes

- Keep frontend API contracts aligned with shared schemas in `src/shared/schemas/` and backend routes in `functions/_shared/routes/`.
- Auth-sensitive backend routes are protected through middleware in `functions/_shared/app.ts` and `functions/_shared/middleware/auth.ts`; preserve public allowlist behavior for `/api`, `/api/time`, `/api/config`, and `/api/auth/*`.
- Database writes live mostly in `functions/_shared/services/`; use Drizzle schema names and be mindful that D1 transaction behavior differs from local SQLite.
- Mood entries, groups, goals, import, and fitness flows are tightly coupled across frontend state, shared schemas, backend services, and migrations. Update all layers together.
- Current hotspot files from projscan: `functions/_shared/services/mood-service.ts`, `src/App.tsx`, `src/components/history/EntryModal.tsx`, `src/services/api.ts`, `src/views/EntryView.tsx`, and `src/views/SettingsView.tsx`. Inspect these carefully before changes that touch their flows.
- Suggested guardrails: run `projscan doctor --format json`, `projscan preflight --mode before_edit --format json`, and `npm test` before risky edits.

## Known Issues

Projscan health: **F (39)** with 1 error and 2 warnings. Top reported items:

1. `functions/_shared/app.test.ts:9` is flagged as a potential hardcoded generic secret. It appears to be test fixture configuration; verify before treating it as a production secret.
2. No Prettier configuration was detected. Formatting currently relies on ESLint/TypeScript and existing style.
3. `tailwindcss` is reported as an unused dependency. It may be used through Tailwind/Vite configuration rather than direct source imports; verify before removing.

<!-- END PROJSCAN -->
