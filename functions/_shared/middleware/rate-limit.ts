import { rateLimiter } from 'hono-rate-limiter';
import type { AppEnv } from '../lib/env';

/**
 * Global request cap, mirroring the slowapi Limiter wired up in api/main.py
 * (configured there but not applied per-route). Uses the in-memory store —
 * fine for a self-hosted, low-traffic deployment; swap in a KV/Durable Object
 * store via hono-rate-limiter's `store` option if running multi-region at scale.
 */
export const rateLimit = rateLimiter<AppEnv>({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('CF-Connecting-IP') ?? c.req.header('x-forwarded-for') ?? 'anonymous',
});
