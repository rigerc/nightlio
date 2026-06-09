import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import { moodIconsRequestSchema, timeFormatRequestSchema } from '@shared/schemas/preferences';
import {
  getMoodIcons,
  getUse24HourTime,
  saveMoodIcons,
  saveUse24HourTime,
} from '../services/preferences-service';

export const preferencesRoutes = new Hono<AppEnv>();

preferencesRoutes.get('/preferences/mood-icons', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  return c.json({ icons: await getMoodIcons(db, userId) });
});

preferencesRoutes.put('/preferences/mood-icons', zValidator('json', moodIconsRequestSchema), async (c) => {
  const userId = c.get('userId');
  const { icons } = c.req.valid('json');
  const db = createDb(c.env.DB);

  const validated: Record<string, string> = {};
  for (const [key, value] of Object.entries(icons)) {
    const moodVal = Number.parseInt(key, 10);
    if (Number.isInteger(moodVal) && moodVal >= 1 && moodVal <= 5) {
      validated[String(moodVal)] = String(value);
    }
  }

  await saveMoodIcons(db, userId, validated);
  return c.json({ status: 'success', icons: validated });
});

preferencesRoutes.get('/preferences/time-format', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  return c.json({ use_24_hour_time: await getUse24HourTime(db, userId) });
});

preferencesRoutes.put('/preferences/time-format', zValidator('json', timeFormatRequestSchema), async (c) => {
  const userId = c.get('userId');
  const { use_24_hour_time: use24HourTime } = c.req.valid('json');
  const db = createDb(c.env.DB);

  await saveUse24HourTime(db, userId, use24HourTime);
  return c.json({ status: 'success', use_24_hour_time: use24HourTime });
});
