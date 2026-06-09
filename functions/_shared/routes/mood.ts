import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import { moodCreateSchema, moodLogCreateSchema, moodUpdateSchema } from '@shared/schemas/mood';
import {
  ValidationError,
  addMoodLog,
  createMoodEntry,
  deleteEntry,
  deleteMoodLog,
  getCurrentStreak,
  getEntryById,
  getEntrySelections,
  getEntrySliderValues,
  getHydratedEntries,
  getMoodLogs,
  getStatistics,
  updateEntry,
} from '../services/mood-service';

const moodQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const entryIdParamSchema = z.object({ entry_id: z.coerce.number().int() });
const logIdParamSchema = z.object({ entry_id: z.coerce.number().int(), log_id: z.coerce.number().int() });

export const moodRoutes = new Hono<AppEnv>();

moodRoutes.post('/mood', zValidator('json', moodCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    const result = await createMoodEntry(db, userId, body);
    return c.json(
      {
        status: 'success',
        entry_id: result.entry_id,
        new_achievements: result.new_achievements,
        message: 'Mood entry created successfully',
      },
      201
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new HTTPException(400, { message: err.message });
    }
    throw err;
  }
});

moodRoutes.get('/moods', zValidator('query', moodQuerySchema), async (c) => {
  const userId = c.get('userId');
  const { start_date: startDate, end_date: endDate } = c.req.valid('query');
  const db = createDb(c.env.DB);

  const hydratedEntries = await getHydratedEntries(db, userId, {
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
  });

  return c.json(hydratedEntries);
});

moodRoutes.get('/mood/:entry_id', zValidator('param', entryIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { entry_id: entryId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const entry = await getEntryById(db, userId, entryId);
  if (!entry) {
    throw new HTTPException(404, { message: 'Entry not found' });
  }
  return c.json(entry);
});

moodRoutes.put(
  '/mood/:entry_id',
  zValidator('param', entryIdParamSchema),
  zValidator('json', moodUpdateSchema),
  async (c) => {
    const userId = c.get('userId');
    const { entry_id: entryId } = c.req.valid('param');
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);

    if (Object.keys(body).length === 0) {
      throw new HTTPException(400, { message: 'No update fields provided' });
    }

    try {
      const updated = await updateEntry(db, userId, entryId, body);
      if (!updated) {
        throw new HTTPException(404, { message: 'Entry not found or no changes made' });
      }
      return c.json({ status: 'success', message: 'Mood entry updated successfully', entry: updated });
    } catch (err) {
      if (err instanceof HTTPException) throw err;
      if (err instanceof ValidationError) {
        throw new HTTPException(400, { message: err.message });
      }
      throw err;
    }
  }
);

moodRoutes.delete('/mood/:entry_id', zValidator('param', entryIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { entry_id: entryId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const success = await deleteEntry(db, userId, entryId);
  if (!success) {
    throw new HTTPException(404, { message: 'Entry not found' });
  }
  return c.json({ status: 'success', message: 'Mood entry deleted successfully' });
});

moodRoutes.get('/statistics', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  return c.json(await getStatistics(db, userId));
});

moodRoutes.get('/streak', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const streak = await getCurrentStreak(db, userId);
  return c.json({
    current_streak: streak,
    message: `Current streak: ${streak} day${streak !== 1 ? 's' : ''}`,
  });
});

moodRoutes.get('/mood/:entry_id/selections', zValidator('param', entryIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { entry_id: entryId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const entry = await getEntryById(db, userId, entryId);
  if (!entry) return c.json([]);
  return c.json(await getEntrySelections(db, entryId));
});

moodRoutes.get('/mood/:entry_id/slider-values', zValidator('param', entryIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { entry_id: entryId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const entry = await getEntryById(db, userId, entryId);
  if (!entry) return c.json([]);
  return c.json(await getEntrySliderValues(db, entryId));
});

moodRoutes.post(
  '/mood/:entry_id/logs',
  zValidator('param', entryIdParamSchema),
  zValidator('json', moodLogCreateSchema),
  async (c) => {
    const userId = c.get('userId');
    const { entry_id: entryId } = c.req.valid('param');
    const { mood } = c.req.valid('json');
    const db = createDb(c.env.DB);

    try {
      const result = await addMoodLog(db, userId, entryId, mood);
      return c.json(
        {
          status: 'success',
          log_id: result.log_id,
          mood: result.mood,
          logged_at: result.logged_at,
          updated_entry_mood: result.updated_entry_mood,
          message: 'Mood log added',
        },
        201
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new HTTPException(404, { message: err.message });
      }
      throw err;
    }
  }
);

moodRoutes.get('/mood/:entry_id/logs', zValidator('param', entryIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { entry_id: entryId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  try {
    return c.json(await getMoodLogs(db, userId, entryId));
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new HTTPException(404, { message: err.message });
    }
    throw err;
  }
});

moodRoutes.delete('/mood/:entry_id/logs/:log_id', zValidator('param', logIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { entry_id: entryId, log_id: logId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const result = await deleteMoodLog(db, userId, entryId, logId);
  if (result === null) {
    throw new HTTPException(404, { message: 'Log not found' });
  }
  return c.json({ status: 'success', updated_entry_mood: result, message: 'Mood log deleted' });
});
