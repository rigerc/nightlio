import { Hono } from 'hono';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import {
  ACHIEVEMENT_METADATA,
  checkAchievements,
  getAchievementsProgress,
  getUserAchievements,
} from '../services/achievement-service';

export const achievementRoutes = new Hono<AppEnv>();

function withMetadata(achievementType: string) {
  return ACHIEVEMENT_METADATA[achievementType] ?? {};
}

achievementRoutes.get('/achievements', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  const achievements = await getUserAchievements(db, userId);
  return c.json(achievements.map((achievement) => ({ ...achievement, ...withMetadata(achievement.achievement_type) })));
});

achievementRoutes.post('/achievements/check', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  const newAchievementTypes = await checkAchievements(db, userId);
  const newAchievements = newAchievementTypes.map((achievementType) => ({
    ...withMetadata(achievementType),
    achievement_type: achievementType,
  }));

  return c.json({ new_achievements: newAchievements, count: newAchievements.length });
});

achievementRoutes.get('/achievements/progress', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  return c.json(await getAchievementsProgress(db, userId));
});
