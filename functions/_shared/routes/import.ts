import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import { daylioImportSchema, daylioPrepareSchema } from '@shared/schemas/import';
import { importDaylioEntries, prepareDaylioImport } from '../services/import-service';
import { ValidationError } from '../services/mood-service';
import { ValidationError as GroupValidationError } from '../services/group-service';

export const importRoutes = new Hono<AppEnv>();

function isValidationError(err: unknown): err is Error {
  return err instanceof ValidationError || err instanceof GroupValidationError;
}

importRoutes.post('/import/daylio/prepare', zValidator('json', daylioPrepareSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    const result = await prepareDaylioImport(db, userId, body);
    return c.json({ status: 'success', group_ids: result.groupIds, option_ids: result.optionIds });
  } catch (err) {
    if (isValidationError(err)) {
      throw new HTTPException(400, { message: err.message });
    }
    throw err;
  }
});

importRoutes.post('/import/daylio', zValidator('json', daylioImportSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    const result = await importDaylioEntries(db, userId, body);
    return c.json({ status: 'success', imported: result.imported, skipped: result.skipped });
  } catch (err) {
    if (isValidationError(err)) {
      throw new HTTPException(400, { message: err.message });
    }
    throw err;
  }
});
