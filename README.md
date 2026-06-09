# Waymark

Waymark is a privacy-first mood tracker and journal. It is now a Cloudflare-first app built with:

- React + Vite frontend
- Hono API in Cloudflare Pages Functions
- Cloudflare D1 database
- Drizzle migrations

The old Python/FastAPI and Docker deployment path has been removed. Use Cloudflare Pages + D1 for new deployments.

## Features

- Daily mood entries with Markdown journaling
- Custom activity groups, options, and sliders
- Mood history, statistics, streaks, and achievements
- Optional local single-user login
- Optional Clerk multi-user auth
- Optional Google Health integration

## Requirements

- Node.js 20+
- npm
- A Cloudflare account for deployed environments
- Wrangler CLI (installed as a project dev dependency)

## Local development

Install dependencies:

```bash
npm install
```

Create a local Worker env file from the example:

```bash
cp .env.example .dev.vars
```

Set at least `JWT_SECRET` in `.dev.vars`.

Apply D1 migrations locally:

```bash
npm run db:migrate
```

Run the Pages Functions API locally:

```bash
npm run pages:dev
```

In a second terminal, run the Vite frontend:

```bash
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to Wrangler on port 8788.

## Cloudflare deployment

1. Create a D1 database:

   ```bash
   npx wrangler d1 create waymark-db
   ```

2. Put the returned database ID in `wrangler.toml` under `database_id`.

3. Apply remote migrations:

   ```bash
   npm run db:migrate:remote
   ```

4. Set required secrets:

   ```bash
   npx wrangler pages secret put JWT_SECRET
   ```

   If using Clerk, also set:

   ```bash
   npx wrangler pages secret put CLERK_JWT_KEY
   ```

5. Build and deploy:

   ```bash
   npm run pages:deploy
   ```

You can also connect the repository to Cloudflare Pages and use `npm run build` as the build command with `dist` as the output directory. Ensure the D1 binding is named `DB`.

## Configuration

Runtime configuration is read from Cloudflare Worker bindings and variables. See `.env.example` and `wrangler.toml` for supported values.

Common variables:

- `JWT_SECRET` — required for local JWT sessions.
- `JWT_EXPIRES_IN_SECONDS` — optional; defaults to 3600.
- `DEFAULT_SELF_HOST_ID`, `SELFHOST_USER_NAME`, `SELFHOST_USER_EMAIL` — local single-user defaults.
- `SELFHOST_ACCESS_KEY` — required for local login outside localhost.
- `CORS_ORIGINS` — comma-separated origins for split-origin development.
- `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`, `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth.
- `ENABLE_GOOGLE_HEALTH`, `GOOGLE_HEALTH_CLIENT_ID`, `FITNESS_TOKEN_KEY` — Google Health.

Do not set `VITE_API_URL` for normal usage. Local dev and Cloudflare Pages both use same-origin `/api` paths.

## Scripts

```bash
npm run dev              # Vite frontend
npm run pages:dev        # Build + local Cloudflare Pages Functions
npm run build            # Production frontend build
npm run typecheck        # TypeScript checks for frontend and functions
npm run lint             # ESLint
npm run test:hono        # Hono/schema tests
npm test                 # Typecheck + lint + tests
npm run db:migrate       # Apply local D1 migrations
npm run db:migrate:remote# Apply remote D1 migrations
```

## Project layout

```text
src/                  React app and shared schemas
functions/            Hono Cloudflare Pages Functions API
drizzle/              D1 migrations
public/               Static assets
```

## Removed deployment path

Python/FastAPI, SQLite Docker services, nginx Docker proxy config, and GHCR image publishing are no longer supported in this repository. If you need to migrate data from an old SQLite deployment, use the migration tooling before deleting your old deployment data.
