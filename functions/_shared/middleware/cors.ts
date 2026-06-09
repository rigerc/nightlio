import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/env';
import { corsOrigins } from '../lib/env';

export const corsMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const handler = cors({
    origin: corsOrigins(c.env),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
  return handler(c, next);
});
