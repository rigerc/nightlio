import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../lib/env';
import { isTruthy } from '../lib/env';
import { createDb } from '../db/client';
import { storeTokensRequestSchema } from '@shared/schemas/fitness';
import {
  FitnessError,
  disconnect,
  getConnectionStatus,
  getData,
  storeTokens,
  sync,
} from '../services/fitness-service';

const DEFAULT_PROVIDER = 'google_health';

const statusQuerySchema = z.object({ provider: z.string().default(DEFAULT_PROVIDER) });
const syncQuerySchema = z.object({
  provider: z.string().default(DEFAULT_PROVIDER),
  days: z.coerce.number().int().min(1).max(90).default(30),
});
const dataQuerySchema = z.object({
  provider: z.string().default(DEFAULT_PROVIDER),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const fitnessRoutes = new Hono<AppEnv>();

fitnessRoutes.post('/fitness/tokens', zValidator('json', storeTokensRequestSchema), async (c) => {
  if (!isTruthy(c.env.ENABLE_GOOGLE_HEALTH)) {
    throw new HTTPException(404);
  }

  const userId = c.get('userId');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    await storeTokens(
      db,
      c.env,
      userId,
      body.provider,
      body.access_token,
      body.refresh_token,
      body.expires_in
    );
  } catch (err) {
    console.error(`Failed to store fitness tokens for user ${userId}:`, err);
    throw new HTTPException(500, { message: 'Failed to store tokens' });
  }

  return c.body(null, 204);
});

fitnessRoutes.get('/fitness/status', zValidator('query', statusQuerySchema), async (c) => {
  const userId = c.get('userId');
  const { provider } = c.req.valid('query');
  const db = createDb(c.env.DB);
  return c.json(await getConnectionStatus(db, userId, provider));
});

fitnessRoutes.post('/fitness/sync', zValidator('query', syncQuerySchema), async (c) => {
  if (!isTruthy(c.env.ENABLE_GOOGLE_HEALTH)) {
    throw new HTTPException(404);
  }

  const userId = c.get('userId');
  const { provider, days } = c.req.valid('query');
  const db = createDb(c.env.DB);

  try {
    const rows = await sync(db, c.env, userId, provider, days);
    return c.json({ status: 'ok', rows_synced: rows, provider });
  } catch (err) {
    if (err instanceof FitnessError) {
      throw new HTTPException(400, { message: err.message });
    }
    console.error(`Fitness sync failed for user ${userId}:`, err);
    throw new HTTPException(500, { message: 'Sync failed' });
  }
});

fitnessRoutes.delete('/fitness/disconnect', zValidator('query', statusQuerySchema), async (c) => {
  const userId = c.get('userId');
  const { provider } = c.req.valid('query');
  const db = createDb(c.env.DB);
  await disconnect(db, userId, provider);
  return c.json({ status: 'ok' });
});

fitnessRoutes.get('/fitness/data', zValidator('query', dataQuerySchema), async (c) => {
  const userId = c.get('userId');
  const { provider, start_date: startDate, end_date: endDate } = c.req.valid('query');
  const db = createDb(c.env.DB);
  const data = await getData(db, userId, startDate, endDate);
  return c.json({ data, provider });
});
