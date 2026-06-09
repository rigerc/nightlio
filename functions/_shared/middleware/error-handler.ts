import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { AppEnv } from '../lib/env';

// Keep API failures in a stable {"error": ...} envelope for frontend callers.
export const onError: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: err.flatten() }, 422);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
};

export const notFound: NotFoundHandler<AppEnv> = (c) => c.json({ error: 'Not found' }, 404);
