import { and, asc, between, desc, eq, inArray, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { toBatch, type Database } from '../db/client';
import {
  entryMoodLogs,
  entrySelections,
  entrySliderValues,
  groupOptions,
  groups,
  moodEntries,
} from '../db/schema';
import type { MoodCreateInput, MoodUpdateInput } from '@shared/schemas/mood';
import {
  checkAchievements,
  getCurrentStreak,
  getMoodCounts,
  getMoodStatistics,
  incrementStatsView,
} from './achievement-service';

export class ValidationError extends Error {}

export interface MoodEntryRecord {
  id: number;
  date: string;
  mood: number;
  content: string;
  created_at: string;
  updated_at: string;
  is_important: boolean;
  important_reason: string | null;
}

export interface EntrySelectionRecord {
  id: number;
  group_id: number;
  name: string;
  icon: string | null;
  group_name: string;
  group_color: string | null;
}

export interface EntrySliderValueRecord {
  id: number;
  group_id: number;
  value: number;
  group_name: string;
  group_color: string | null;
  group_icon: string | null;
  slider_min: number | null;
  slider_max: number | null;
  slider_labels: string[] | null;
}

export interface MoodLogRecord {
  id: number;
  entry_id: number;
  mood: number;
  logged_at: string;
}

function toEntryRecord(row: typeof moodEntries.$inferSelect): MoodEntryRecord {
  return {
    id: row.id,
    date: row.date,
    mood: row.mood,
    content: row.content,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    is_important: row.isImportant,
    important_reason: row.importantReason,
  };
}

function assertImportantReason(isImportant: boolean | undefined, importantReason: string | undefined | null): void {
  if (isImportant && !(importantReason ?? '').trim()) {
    throw new ValidationError('Please provide a reason for marking this day important');
  }
}

async function assertUserOwnedEntryFields(
  db: Database,
  userId: number,
  selectedOptions: number[],
  sliderValues: Record<number, number>
): Promise<void> {
  const uniqueOptionIds = [...new Set(selectedOptions)];
  if (uniqueOptionIds.length > 0) {
    const rows = await db
      .select({ id: groupOptions.id })
      .from(groupOptions)
      .innerJoin(groups, eq(groupOptions.groupId, groups.id))
      .where(and(eq(groups.userId, userId), inArray(groupOptions.id, uniqueOptionIds)));
    if (rows.length !== uniqueOptionIds.length) {
      throw new ValidationError('One or more selected options are not available for this user');
    }
  }

  const groupIds = [...new Set(Object.keys(sliderValues).map(Number).filter(Number.isFinite))];
  if (groupIds.length > 0) {
    const rows = await db
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.userId, userId), inArray(groups.id, groupIds)));
    if (rows.length !== groupIds.length) {
      throw new ValidationError('One or more sliders are not available for this user');
    }
  }
}

export async function getEntrySelections(db: Database, entryId: number): Promise<EntrySelectionRecord[]> {
  const rows = await db
    .select({
      id: groupOptions.id,
      group_id: groupOptions.groupId,
      name: groupOptions.name,
      icon: groupOptions.icon,
      group_name: groups.name,
      group_color: groups.color,
      group_sort_order: groups.sortOrder,
      option_sort_order: groupOptions.sortOrder,
    })
    .from(entrySelections)
    .innerJoin(groupOptions, eq(entrySelections.optionId, groupOptions.id))
    .innerJoin(groups, eq(groupOptions.groupId, groups.id))
    .where(eq(entrySelections.entryId, entryId))
    .orderBy(asc(groups.sortOrder), asc(groups.name), asc(groupOptions.sortOrder), asc(groupOptions.name));

  return rows.map(({ group_sort_order: _group_sort_order, option_sort_order: _option_sort_order, ...rest }) => rest);
}

export async function getEntrySliderValues(db: Database, entryId: number): Promise<EntrySliderValueRecord[]> {
  const rows = await db
    .select({
      id: entrySliderValues.id,
      group_id: entrySliderValues.groupId,
      value: entrySliderValues.value,
      group_name: groups.name,
      group_color: groups.color,
      group_icon: groups.icon,
      slider_min: groups.sliderMin,
      slider_max: groups.sliderMax,
      slider_labels: groups.sliderLabels,
      group_sort_order: groups.sortOrder,
    })
    .from(entrySliderValues)
    .innerJoin(groups, eq(entrySliderValues.groupId, groups.id))
    .where(eq(entrySliderValues.entryId, entryId))
    .orderBy(asc(groups.sortOrder), asc(groups.name));

  return rows.map(({ group_sort_order: _group_sort_order, ...rest }) => rest);
}

export async function createMoodEntry(
  db: Database,
  userId: number,
  input: MoodCreateInput,
  opts?: { skipAchievements?: boolean }
) {
  assertImportantReason(input.is_important, input.important_reason);

  const isImportant = Boolean(input.is_important);
  const selectedOptions = input.selected_options ?? [];
  const sliderValues = input.slider_values ?? {};
  await assertUserOwnedEntryFields(db, userId, selectedOptions, sliderValues);

  const [inserted] = await db
    .insert(moodEntries)
    .values({
      userId,
      date: input.date,
      mood: input.mood,
      content: input.content,
      ...(input.time ? { createdAt: input.time } : {}),
      isImportant,
      importantReason: input.important_reason ?? null,
    })
    .returning({ id: moodEntries.id });

  const entryId = inserted.id;

  // D1 has no cross-statement transactions reachable from Drizzle (see toBatch);
  // the dependent rows reference `entryId`, so they're inserted in one atomic
  // batch after the parent row exists, with a best-effort cleanup on failure.
  const dependentInserts: BatchItem<'sqlite'>[] = [];
  if (selectedOptions.length > 0) {
    dependentInserts.push(
      db.insert(entrySelections).values(selectedOptions.map((optionId) => ({ entryId, optionId })))
    );
  }

  const sliderEntries = Object.entries(sliderValues);
  if (sliderEntries.length > 0) {
    dependentInserts.push(
      db.insert(entrySliderValues).values(
        sliderEntries.map(([groupId, value]) => ({
          entryId,
          groupId: Number(groupId),
          value,
        }))
      )
    );
  }

  dependentInserts.push(
    db.insert(entryMoodLogs).values({
      entryId,
      mood: input.mood,
      ...(input.time ? { loggedAt: input.time } : {}),
    })
  );

  try {
    await db.batch(toBatch(dependentInserts));
  } catch (err) {
    await db.delete(moodEntries).where(eq(moodEntries.id, entryId));
    throw err;
  }

  const newAchievements = opts?.skipAchievements ? [] : await checkAchievements(db, userId);

  return { entry_id: entryId, new_achievements: newAchievements };
}

export async function getAllEntries(db: Database, userId: number): Promise<MoodEntryRecord[]> {
  const rows = await db
    .select()
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId))
    .orderBy(desc(moodEntries.createdAt), desc(moodEntries.date));
  return rows.map(toEntryRecord);
}

export async function getEntriesByDateRange(
  db: Database,
  userId: number,
  startDate: string,
  endDate: string
): Promise<MoodEntryRecord[]> {
  const rows = await db
    .select()
    .from(moodEntries)
    .where(and(eq(moodEntries.userId, userId), between(moodEntries.date, startDate, endDate)))
    .orderBy(desc(moodEntries.createdAt), desc(moodEntries.date));
  return rows.map(toEntryRecord);
}

export async function getEntryById(db: Database, userId: number, entryId: number): Promise<MoodEntryRecord | null> {
  const row = await db.query.moodEntries.findFirst({
    where: and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)),
  });
  return row ? toEntryRecord(row) : null;
}

export async function updateEntry(db: Database, userId: number, entryId: number, input: MoodUpdateInput) {
  assertImportantReason(input.is_important, input.important_reason);

  const existing = await db.query.moodEntries.findFirst({
    where: and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)),
    columns: { id: true },
  });
  if (!existing) {
    return null;
  }

  if (input.selected_options !== undefined || input.slider_values !== undefined) {
    await assertUserOwnedEntryFields(db, userId, input.selected_options ?? [], input.slider_values ?? {});
  }

  const updates: Record<string, unknown> = {};
  if (input.mood !== undefined) updates.mood = input.mood;
  if (input.content !== undefined) updates.content = input.content;
  if (input.date !== undefined) updates.date = input.date;
  if (input.time !== undefined) updates.createdAt = input.time;
  if (input.is_important !== undefined) updates.isImportant = input.is_important;
  if (input.important_reason !== undefined) updates.importantReason = input.important_reason;
  updates.updatedAt = sql`CURRENT_TIMESTAMP`;

  const statements: BatchItem<'sqlite'>[] = [
    db
      .update(moodEntries)
      .set(updates)
      .where(and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId))),
  ];

  if (input.selected_options !== undefined) {
    statements.push(db.delete(entrySelections).where(eq(entrySelections.entryId, entryId)));
    if (input.selected_options.length > 0) {
      statements.push(
        db.insert(entrySelections).values(
          input.selected_options.map((optionId) => ({ entryId, optionId }))
        )
      );
    }
  }

  if (input.slider_values !== undefined) {
    statements.push(db.delete(entrySliderValues).where(eq(entrySliderValues.entryId, entryId)));
    const sliderEntries = Object.entries(input.slider_values);
    if (sliderEntries.length > 0) {
      statements.push(
        db.insert(entrySliderValues).values(
          sliderEntries.map(([groupId, value]) => ({
            entryId,
            groupId: Number(groupId),
            value,
          }))
        )
      );
    }
  }

  await db.batch(toBatch(statements));

  const entry = await getEntryById(db, userId, entryId);
  if (!entry) return null;

  const selections = await getEntrySelections(db, entryId);
  const sliderValues = await getEntrySliderValues(db, entryId);

  return { ...entry, selections, slider_values: sliderValues };
}

export async function deleteEntry(db: Database, userId: number, entryId: number): Promise<boolean> {
  const result = await db
    .delete(moodEntries)
    .where(and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)))
    .returning({ id: moodEntries.id });
  return result.length > 0;
}

async function recalculateAverageMood(db: Database, entryId: number): Promise<number | null> {
  const [row] = await db
    .select({ avgMood: sql<number | null>`ROUND(AVG(${entryMoodLogs.mood}))` })
    .from(entryMoodLogs)
    .where(eq(entryMoodLogs.entryId, entryId));

  if (!row || row.avgMood == null) return null;

  const mood = Math.trunc(row.avgMood);
  await db
    .update(moodEntries)
    .set({ mood, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(moodEntries.id, entryId));

  return mood;
}

export async function addMoodLog(db: Database, userId: number, entryId: number, mood: number) {
  const entry = await db.query.moodEntries.findFirst({
    where: and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)),
    columns: { id: true },
  });
  if (!entry) {
    throw new ValidationError('Entry not found');
  }

  // Sequential read-then-write (recalc depends on the row just inserted, and the
  // response depends on the row recalc just updated) — D1 has no cross-statement
  // transaction primitive reachable from Drizzle that allows intermediate reads
  // (see toBatch), so these run as separate auto-committed statements.
  const [inserted] = await db
    .insert(entryMoodLogs)
    .values({ entryId, mood })
    .returning({ id: entryMoodLogs.id, mood: entryMoodLogs.mood, loggedAt: entryMoodLogs.loggedAt });

  await recalculateAverageMood(db, entryId);

  const [updatedEntry] = await db
    .select({ mood: moodEntries.mood })
    .from(moodEntries)
    .where(eq(moodEntries.id, entryId));

  return {
    log_id: inserted.id,
    mood: inserted.mood,
    logged_at: inserted.loggedAt,
    updated_entry_mood: updatedEntry?.mood ?? mood,
  };
}

export async function getMoodLogs(db: Database, userId: number, entryId: number): Promise<MoodLogRecord[]> {
  const entry = await db.query.moodEntries.findFirst({
    where: and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)),
    columns: { id: true },
  });
  if (!entry) {
    throw new ValidationError('Entry not found');
  }

  const rows = await db
    .select({
      id: entryMoodLogs.id,
      entry_id: entryMoodLogs.entryId,
      mood: entryMoodLogs.mood,
      logged_at: entryMoodLogs.loggedAt,
    })
    .from(entryMoodLogs)
    .where(eq(entryMoodLogs.entryId, entryId))
    .orderBy(asc(entryMoodLogs.loggedAt));

  return rows;
}

export async function deleteMoodLog(
  db: Database,
  userId: number,
  entryId: number,
  logId: number
): Promise<number | null> {
  const entry = await db.query.moodEntries.findFirst({
    where: and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)),
    columns: { id: true },
  });
  if (!entry) {
    return null;
  }

  const deleted = await db
    .delete(entryMoodLogs)
    .where(and(eq(entryMoodLogs.id, logId), eq(entryMoodLogs.entryId, entryId)))
    .returning({ id: entryMoodLogs.id });

  if (deleted.length === 0) {
    return null;
  }

  const recalculatedMood = await recalculateAverageMood(db, entryId);
  if (recalculatedMood !== null) return recalculatedMood;

  const [updatedEntry] = await db
    .select({ mood: moodEntries.mood })
    .from(moodEntries)
    .where(eq(moodEntries.id, entryId));

  return updatedEntry?.mood ?? null;
}

export async function getStatistics(db: Database, userId: number) {
  // Track statistics view for achievements (Data Lover); metrics must not break stats.
  try {
    await incrementStatsView(db, userId);
  } catch {
    // ignore
  }

  const [statistics, moodDistribution, currentStreak] = await Promise.all([
    getMoodStatistics(db, userId),
    getMoodCounts(db, userId),
    getCurrentStreak(db, userId),
  ]);

  return {
    statistics,
    mood_distribution: moodDistribution,
    current_streak: currentStreak,
  };
}

export { getCurrentStreak };
