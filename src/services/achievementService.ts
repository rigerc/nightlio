import { count, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { achievements, moodEntries } from '../db/schema';

export interface MoodStatistics {
  total_entries: number;
  average_mood: number;
  lowest_mood: number | null;
  highest_mood: number | null;
  first_entry_date: string | null;
  last_entry_date: string | null;
}

export interface AchievementProgress {
  current: number;
  max: number;
}

const ACHIEVEMENT_THRESHOLDS: Record<string, number> = {
  first_entry: 1,
  week_warrior: 7,
  consistency_king: 30,
  mood_master: 100,
};

export async function getMoodStatistics(): Promise<MoodStatistics> {
  const [row] = await db
    .select({
      totalEntries: count(moodEntries.id),
      averageMood: sql<number | null>`AVG(${moodEntries.mood})`,
      lowestMood: sql<number | null>`MIN(${moodEntries.mood})`,
      highestMood: sql<number | null>`MAX(${moodEntries.mood})`,
      firstEntryDate: sql<string | null>`MIN(${moodEntries.date})`,
      lastEntryDate: sql<string | null>`MAX(${moodEntries.date})`,
    })
    .from(moodEntries);

  if (!row || row.totalEntries === 0) {
    return {
      total_entries: 0,
      average_mood: 0,
      lowest_mood: null,
      highest_mood: null,
      first_entry_date: null,
      last_entry_date: null,
    };
  }

  return {
    total_entries: row.totalEntries,
    average_mood: row.averageMood ? Math.round(row.averageMood * 100) / 100 : 0,
    lowest_mood: row.lowestMood,
    highest_mood: row.highestMood,
    first_entry_date: row.firstEntryDate,
    last_entry_date: row.lastEntryDate,
  };
}

export async function getMoodCounts(): Promise<Record<number, number>> {
  const rows = await db
    .select({ mood: moodEntries.mood, count: count(moodEntries.id) })
    .from(moodEntries)
    .groupBy(moodEntries.mood)
    .orderBy(moodEntries.mood);

  const result: Record<number, number> = {};
  for (const row of rows) {
    result[row.mood] = row.count;
  }
  return result;
}

async function getUserEntryDates(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ date: moodEntries.date })
    .from(moodEntries)
    .orderBy(sql`${moodEntries.date} DESC`);
  return rows.map((row) => row.date);
}

const DATE_FORMATS: Array<(value: string) => Date | null> = [
  (value) => {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const [, month, day, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  },
  (value) => {
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
    if (!match) return null;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  },
];

function parseDateStrings(dateStrings: string[]): Date[] {
  const parsed: Date[] = [];
  for (const dateStr of dateStrings) {
    for (const parser of DATE_FORMATS) {
      const date = parser(dateStr);
      if (date) {
        parsed.push(date);
        break;
      }
    }
  }
  return parsed.sort((a, b) => b.getTime() - a.getTime());
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

function calculateStreakFromDates(parsedDates: Date[]): number {
  if (parsedDates.length === 0) return 0;
  const today = new Date();
  const mostRecent = parsedDates[0];
  if (daysBetween(today, mostRecent) > 1) return 0;

  let streak = 0;
  let expectedDate = startOfDay(mostRecent);
  for (const entryDate of parsedDates) {
    if (daysBetween(entryDate, expectedDate) === 0) {
      streak += 1;
      expectedDate = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export async function getCurrentStreak(): Promise<number> {
  try {
    const dates = await getUserEntryDates();
    if (dates.length === 0) return 0;
    const parsedDates = parseDateStrings(dates);
    if (parsedDates.length === 0) return 0;
    return calculateStreakFromDates(parsedDates);
  } catch {
    return 0;
  }
}

async function addAchievement(achievementType: string): Promise<number | null> {
  try {
    const [row] = await db
      .insert(achievements)
      .values({ achievementType })
      .onConflictDoNothing()
      .returning({ id: achievements.id });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

export interface AchievementRecord {
  id: number;
  achievement_type: string;
  earned_at: string;
}

export async function getUserAchievements(): Promise<AchievementRecord[]> {
  const rows = await db.query.achievements.findMany({
    orderBy: (table, { desc }) => [desc(table.earnedAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    achievement_type: row.achievementType,
    earned_at: row.earnedAt,
  }));
}

export async function checkAchievements(): Promise<string[]> {
  const newAchievements: string[] = [];
  const stats = await getMoodStatistics();
  const currentStreak = await getCurrentStreak();

  const achievementsToCheck: Array<[string, boolean]> = [
    ['first_entry', stats.total_entries >= 1],
    ['week_warrior', currentStreak >= 7],
    ['consistency_king', currentStreak >= 30],
    ['mood_master', stats.total_entries >= 100],
  ];

  for (const [achievementType, condition] of achievementsToCheck) {
    if (condition) {
      const achievementId = await addAchievement(achievementType);
      if (achievementId) {
        newAchievements.push(achievementType);
      }
    }
  }

  return newAchievements;
}

function clamp(value: number, maximum: number): number {
  return Math.max(0, Math.min(value, maximum));
}

export async function getAchievementsProgress(): Promise<Record<string, AchievementProgress>> {
  const stats = await getMoodStatistics();
  const currentStreak = await getCurrentStreak();

  return {
    first_entry: { current: clamp(stats.total_entries, ACHIEVEMENT_THRESHOLDS.first_entry), max: ACHIEVEMENT_THRESHOLDS.first_entry },
    week_warrior: { current: clamp(currentStreak, ACHIEVEMENT_THRESHOLDS.week_warrior), max: ACHIEVEMENT_THRESHOLDS.week_warrior },
    consistency_king: { current: clamp(currentStreak, ACHIEVEMENT_THRESHOLDS.consistency_king), max: ACHIEVEMENT_THRESHOLDS.consistency_king },
    mood_master: { current: clamp(stats.total_entries, ACHIEVEMENT_THRESHOLDS.mood_master), max: ACHIEVEMENT_THRESHOLDS.mood_master },
  };
}

export const ACHIEVEMENT_METADATA: Record<string, { name: string; description: string; icon: string; rarity: string }> = {
  first_entry: { name: 'First Entry', description: 'Logged your first mood entry', icon: 'Zap', rarity: 'common' },
  week_warrior: { name: 'Week Warrior', description: 'Maintained a 7-day logging streak', icon: 'Flame', rarity: 'uncommon' },
  consistency_king: { name: 'Consistency King', description: 'Maintained a 30-day logging streak', icon: 'Target', rarity: 'rare' },
  mood_master: { name: 'Mood Master', description: 'Logged 100 mood entries', icon: 'Crown', rarity: 'legendary' },
};
