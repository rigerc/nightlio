import { rateLimiter } from 'hono-rate-limiter';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/env';

/**
 * Global request cap. Uses the in-memory store — fine for a low-traffic
 * deployment; swap in a KV/Durable Object
 * store via hono-rate-limiter's `store` option if running multi-region at scale.
 *
 * `rateLimiter()` schedules timers when constructed, which Workers disallow at
 * module-evaluation time ("disallowed operation in global scope") — build it
 * lazily on first request instead of at import time.
 */
let limiter: ReturnType<typeof rateLimiter<AppEnv>> | null = null;

export const rateLimit = createMiddleware<AppEnv>(async (c, next) => {
  if (!limiter) {
    limiter = rateLimiter<AppEnv>({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-6',
      keyGenerator: (ctx) => ctx.req.header('CF-Connecting-IP') ?? ctx.req.header('x-forwarded-for') ?? 'anonymous',
    });
  }
  return limiter(c, next);
});
