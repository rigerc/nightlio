import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { userPreferences } from '../db/schema';

export interface Preferences {
  mood_icons: Record<string, string> | null;
  use_24_hour_time: boolean;
}

export async function getPreferences(): Promise<Preferences> {
  const row = await db.query.userPreferences.findFirst({ where: eq(userPreferences.id, 1) });
  return {
    mood_icons: row?.moodIcons ?? null,
    use_24_hour_time: row?.use24HourTime ?? false,
  };
}

export async function saveMoodIcons(icons: Record<string, string>): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ id: 1, moodIcons: icons })
    .onConflictDoUpdate({
      target: userPreferences.id,
      set: { moodIcons: icons, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}

export async function saveTimeFormat(use24HourTime: boolean): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ id: 1, use24HourTime })
    .onConflictDoUpdate({
      target: userPreferences.id,
      set: { use24HourTime, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}
