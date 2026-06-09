import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { userPreferences } from '../db/schema';

export async function getMoodIcons(db: Database, userId: number): Promise<Record<string, string>> {
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
    columns: { moodIcons: true },
  });
  return row?.moodIcons ?? {};
}

export async function saveMoodIcons(db: Database, userId: number, icons: Record<string, string>): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, moodIcons: icons, updatedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { moodIcons: icons, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}

export async function getUse24HourTime(db: Database, userId: number): Promise<boolean> {
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
    columns: { use24HourTime: true },
  });
  return Boolean(row?.use24HourTime);
}

export async function saveUse24HourTime(db: Database, userId: number, use24HourTime: boolean): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, use24HourTime, updatedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { use24HourTime, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}
