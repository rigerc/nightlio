# Local testing instructions

These instructions cover testing PR19 locally after the Cloudflare Pages/Hono/D1 and Clerk changes.

## Prerequisites

- Node.js/npm installed
- Dependencies installed with `npm install`
- Local D1 migrations applied

```bash
npm install
npm run db:migrate
```

## Option 1: Test the production-like Pages build

This builds the app and serves the static frontend plus Pages Functions on Wrangler.

```bash
npm run pages:dev
```

Open:

```text
http://localhost:8788
```

This is the best quick smoke test for the Cloudflare Pages + local D1 setup.

## Option 2: Test with Vite HMR + Wrangler API

Use this when actively developing the React app.

Terminal 1 — API/functions + local D1:

```bash
npm run pages:dev
```

Terminal 2 — Vite dev server exposed to the network:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Vite proxies `/api` to Wrangler at `http://localhost:8788` by default.

## Local self-host login

Without Clerk configured, localhost uses the legacy self-host login flow automatically.

For local testing, `.dev.vars` should include at least:

```bash
JWT_SECRET=local-dev-jwt-secret-change-me-please-32-chars
```

If you test local-login from a non-localhost origin, also set:

```bash
SELFHOST_ACCESS_KEY=<some-local-test-password>
```

Then enter that access key on the login screen.

## Clerk local testing

Use this when testing real multi-user auth and Google OAuth through Clerk.

### 1. Configure Clerk Dashboard

In Clerk:

1. Create/select an application.
2. Enable the Google social connection.
3. Add local origins/redirects for:
   - `http://localhost:5173`
   - `http://localhost:8788`

### 2. Configure frontend env

Create `.env.local`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Presence of this key enables Clerk UI/session handling in the React app.

### 3. Configure Wrangler dev secrets

Add to `.dev.vars`:

```bash
JWT_SECRET=local-dev-jwt-secret-change-me-please-32-chars
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
CLERK_AUTHORIZED_PARTIES=http://localhost:5173,http://localhost:8788
```

`CLERK_JWT_KEY` is Clerk's JWT verification public key. Keep production values in Cloudflare secrets, not in committed files.

### 4. Run locally

```bash
npm run pages:dev
npm run dev
```

Open:

```text
http://localhost:5173/login
```

Sign in with Google via Clerk. API requests should use Clerk session tokens and create/map an internal Waymark user automatically.

## Smoke checks

After login, verify:

1. History loads without 401/500 errors.
2. Creating a mood-only entry saves.
3. Creating/editing/deleting groups only affects the current user.
4. Selected activity options and slider values save on entries.
5. A second Clerk user does not see the first user's entries, preferences, goals, or groups.

## Useful commands

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

Inspect local D1 directly:

```bash
npx wrangler d1 execute DB --local --command "SELECT COUNT(*) FROM users"
npx wrangler d1 execute DB --local --command "SELECT user_id, COUNT(*) FROM groups GROUP BY user_id"
```
