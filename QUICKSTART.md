# Waymark Quickstart

Waymark runs on Cloudflare Pages Functions (Hono) and D1.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure local variables

```bash
cp .env.example .dev.vars
```

Edit `.dev.vars` and set a strong `JWT_SECRET`.

## 3. Apply local D1 migrations

```bash
npm run db:migrate
```

## 4. Start the local API

```bash
npm run pages:dev
```

## 5. Start the frontend

In another terminal:

```bash
npm run dev
```

Open http://localhost:5173.

## Deploy

1. Create a D1 database with `npx wrangler d1 create waymark-db`.
2. Copy the database ID into `wrangler.toml`.
3. Run `npm run db:migrate:remote`.
4. Set `JWT_SECRET` with `npx wrangler pages secret put JWT_SECRET`.
5. Deploy with `npm run pages:deploy` or connect the repo in Cloudflare Pages.

Docker and the old Python API are no longer supported.
