import { count, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { achievements, moodEntries, userMetrics } from '../db/schema';

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
  data_lover: 10,
  mood_master: 100,
};

export async function incrementStatsView(db: Database, userId: number): Promise<void> {
  await db
    .insert(userMetrics)
    .values({ userId, statsViews: 1 })
    .onConflictDoUpdate({
      target: userMetrics.userId,
      set: {
        statsViews: sql`${userMetrics.statsViews} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function getUserMetrics(db: Database, userId: number): Promise<{ user_id: number; stats_views: number }> {
  const row = await db.query.userMetrics.findFirst({ where: eq(userMetrics.userId, userId) });
  return { user_id: userId, stats_views: row?.statsViews ?? 0 };
}

export async function getMoodStatistics(db: Database, userId: number): Promise<MoodStatistics> {
  const [row] = await db
    .select({
      totalEntries: count(moodEntries.id),
      averageMood: sql<number | null>`AVG(${moodEntries.mood})`,
      lowestMood: sql<number | null>`MIN(${moodEntries.mood})`,
      highestMood: sql<number | null>`MAX(${moodEntries.mood})`,
      firstEntryDate: sql<string | null>`MIN(${moodEntries.date})`,
      lastEntryDate: sql<string | null>`MAX(${moodEntries.date})`,
    })
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId));

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

export async function getMoodCounts(db: Database, userId: number): Promise<Record<number, number>> {
  const rows = await db
    .select({ mood: moodEntries.mood, count: count(moodEntries.id) })
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId))
    .groupBy(moodEntries.mood)
    .orderBy(moodEntries.mood);

  const result: Record<number, number> = {};
  for (const row of rows) {
    result[row.mood] = row.count;
  }
  return result;
}

async function getUserEntryDates(db: Database, userId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ date: moodEntries.date })
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId))
    .orderBy(sql`${moodEntries.date} DESC`);
  return rows.map((row) => row.date);
}

const DATE_FORMATS: Array<(value: string) => Date | null> = [
  // %m/%d/%Y
  (value) => {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const [, month, day, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  },
  // %Y-%m-%d
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
  if (daysBetween(today, mostRecent) > 1) {
    return 0;
  }

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

export async function getCurrentStreak(db: Database, userId: number): Promise<number> {
  try {
    const dates = await getUserEntryDates(db, userId);
    if (dates.length === 0) return 0;
    const parsedDates = parseDateStrings(dates);
    if (parsedDates.length === 0) return 0;
    return calculateStreakFromDates(parsedDates);
  } catch {
    return 0;
  }
}

export async function addAchievement(db: Database, userId: number, achievementType: string): Promise<number | null> {
  try {
    const [row] = await db
      .insert(achievements)
      .values({ userId, achievementType })
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
  nft_minted: boolean;
  nft_token_id: number | null;
  nft_tx_hash: string | null;
}

export async function getUserAchievements(db: Database, userId: number): Promise<AchievementRecord[]> {
  const rows = await db.query.achievements.findMany({
    where: eq(achievements.userId, userId),
    orderBy: (table, { desc }) => [desc(table.earnedAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    achievement_type: row.achievementType,
    earned_at: row.earnedAt,
    nft_minted: row.nftMinted,
    nft_token_id: row.nftTokenId,
    nft_tx_hash: row.nftTxHash,
  }));
}

export async function updateAchievementNft(
  db: Database,
  achievementId: number,
  tokenId: number,
  txHash: string
): Promise<void> {
  await db
    .update(achievements)
    .set({ nftMinted: true, nftTokenId: tokenId, nftTxHash: txHash })
    .where(eq(achievements.id, achievementId));
}

export async function checkAchievements(db: Database, userId: number): Promise<string[]> {
  const newAchievements: string[] = [];
  const stats = await getMoodStatistics(db, userId);
  const currentStreak = await getCurrentStreak(db, userId);
  const metrics = await getUserMetrics(db, userId);

  const achievementsToCheck: Array<[string, boolean]> = [
    ['first_entry', stats.total_entries >= 1],
    ['week_warrior', currentStreak >= 7],
    ['consistency_king', currentStreak >= 30],
    ['data_lover', metrics.stats_views >= 10],
    ['mood_master', stats.total_entries >= 100],
  ];

  for (const [achievementType, condition] of achievementsToCheck) {
    if (condition) {
      const achievementId = await addAchievement(db, userId, achievementType);
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

export async function getAchievementsProgress(db: Database, userId: number): Promise<Record<string, AchievementProgress>> {
  const stats = await getMoodStatistics(db, userId);
  const currentStreak = await getCurrentStreak(db, userId);
  const metrics = await getUserMetrics(db, userId);

  return {
    first_entry: { current: clamp(stats.total_entries, ACHIEVEMENT_THRESHOLDS.first_entry), max: ACHIEVEMENT_THRESHOLDS.first_entry },
    week_warrior: { current: clamp(currentStreak, ACHIEVEMENT_THRESHOLDS.week_warrior), max: ACHIEVEMENT_THRESHOLDS.week_warrior },
    consistency_king: { current: clamp(currentStreak, ACHIEVEMENT_THRESHOLDS.consistency_king), max: ACHIEVEMENT_THRESHOLDS.consistency_king },
    data_lover: { current: clamp(metrics.stats_views, ACHIEVEMENT_THRESHOLDS.data_lover), max: ACHIEVEMENT_THRESHOLDS.data_lover },
    mood_master: { current: clamp(stats.total_entries, ACHIEVEMENT_THRESHOLDS.mood_master), max: ACHIEVEMENT_THRESHOLDS.mood_master },
  };
}

export const ACHIEVEMENT_METADATA: Record<string, { name: string; description: string; icon: string; rarity: string }> = {
  first_entry: { name: 'First Entry', description: 'Logged your first mood entry', icon: 'Zap', rarity: 'common' },
  week_warrior: { name: 'Week Warrior', description: 'Maintained a 7-day logging streak', icon: 'Flame', rarity: 'uncommon' },
  consistency_king: { name: 'Consistency King', description: 'Maintained a 30-day logging streak', icon: 'Target', rarity: 'rare' },
  data_lover: { name: 'Data Lover', description: 'Viewed your statistics 10 times', icon: 'BarChart3', rarity: 'uncommon' },
  mood_master: { name: 'Mood Master', description: 'Logged 100 mood entries', icon: 'Crown', rarity: 'legendary' },
};
