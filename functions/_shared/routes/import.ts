import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import { daylioImportSchema } from '@shared/schemas/import';
import { importDaylioEntries } from '../services/import-service';
import { ValidationError } from '../services/mood-service';

export const importRoutes = new Hono<AppEnv>();

importRoutes.post('/import/daylio', zValidator('json', daylioImportSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    const result = await importDaylioEntries(db, userId, body);
    return c.json({ status: 'success', imported: result.imported, skipped: result.skipped });
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new HTTPException(400, { message: err.message });
    }
    throw err;
  }
});
