import { and, asc, between, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Entry, MoodValue } from '../types';
import { db } from '../db/client';
import {
  entryMoodLogs,
  entrySelections,
  entrySliderValues,
  groupOptions,
  groups,
  moodEntries,
} from '../db/schema';
import type { MoodCreateInput, MoodUpdateInput } from '../shared/schemas/mood';
import { checkAchievements, getMoodStatistics, getMoodCounts, getCurrentStreak } from './achievementService';

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

async function validateEntryFields(
  selectedOptions: number[],
  sliderValues: Record<number, number>
): Promise<void> {
  const uniqueOptionIds = [...new Set(selectedOptions)];
  if (uniqueOptionIds.length > 0) {
    const rows = await db
      .select({ id: groupOptions.id })
      .from(groupOptions)
      .where(inArray(groupOptions.id, uniqueOptionIds));
    if (rows.length !== uniqueOptionIds.length) {
      throw new ValidationError('One or more selected options are not available');
    }
  }

  const sliderEntries = Object.entries(sliderValues)
    .map(([groupId, value]) => ({ groupId: Number(groupId), value }))
    .filter(({ groupId }) => Number.isFinite(groupId));
  const groupIds = [...new Set(sliderEntries.map(({ groupId }) => groupId))];
  if (groupIds.length > 0) {
    const rows = await db
      .select({ id: groups.id, type: groups.type, sliderMin: groups.sliderMin, sliderMax: groups.sliderMax })
      .from(groups)
      .where(inArray(groups.id, groupIds));

    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const { groupId, value } of sliderEntries) {
      const group = byId.get(groupId);
      if (!group || group.type !== 'slider') {
        throw new ValidationError('One or more slider values reference a non-slider group');
      }
      const min = group.sliderMin ?? 1;
      const max = group.sliderMax ?? 5;
      if (value < min || value > max) {
        throw new ValidationError(`Slider value for group ${groupId} must be between ${min} and ${max}`);
      }
    }
  }
}

export async function getEntrySelections(entryId: number): Promise<EntrySelectionRecord[]> {
  const rows = await db
    .select({
      id: groupOptions.id,
      group_id: groupOptions.groupId,
      name: groupOptions.name,
      icon: groupOptions.icon,
      group_name: groups.name,
      group_color: groups.color,
    })
    .from(entrySelections)
    .innerJoin(groupOptions, eq(entrySelections.optionId, groupOptions.id))
    .innerJoin(groups, eq(groupOptions.groupId, groups.id))
    .where(eq(entrySelections.entryId, entryId))
    .orderBy(asc(groups.sortOrder), asc(groups.name), asc(groupOptions.sortOrder), asc(groupOptions.name));

  return rows;
}

export async function getEntrySliderValues(entryId: number): Promise<EntrySliderValueRecord[]> {
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
    })
    .from(entrySliderValues)
    .innerJoin(groups, eq(entrySliderValues.groupId, groups.id))
    .where(eq(entrySliderValues.entryId, entryId))
    .orderBy(asc(groups.sortOrder), asc(groups.name));

  return rows;
}

export async function createMoodEntry(input: MoodCreateInput, opts?: { skipAchievements?: boolean }) {
  assertImportantReason(input.is_important, input.important_reason);

  const isImportant = Boolean(input.is_important);
  const selectedOptions = input.selected_options ?? [];
  const sliderValues = input.slider_values ?? {};
  await validateEntryFields(selectedOptions, sliderValues);

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(moodEntries)
      .values({
        date: input.date,
        mood: input.mood,
        content: input.content,
        ...(input.time ? { createdAt: input.time } : {}),
        isImportant,
        importantReason: input.important_reason ?? null,
      })
      .returning({ id: moodEntries.id });

    const entryId = inserted.id;

    if (selectedOptions.length > 0) {
      await tx.insert(entrySelections).values(selectedOptions.map((optionId) => ({ entryId, optionId })));
    }

    const sliderEntries = Object.entries(sliderValues);
    if (sliderEntries.length > 0) {
      await tx.insert(entrySliderValues).values(
        sliderEntries.map(([groupId, value]) => ({ entryId, groupId: Number(groupId), value }))
      );
    }

    await tx.insert(entryMoodLogs).values({
      entryId,
      mood: input.mood,
      ...(input.time ? { loggedAt: input.time } : {}),
    });

    return entryId;
  }).then(async (entryId) => {
    const newAchievements = opts?.skipAchievements ? [] : await checkAchievements();
    return { entry_id: entryId, new_achievements: newAchievements };
  });
}

export async function getAllEntries(): Promise<MoodEntryRecord[]> {
  const rows = await db
    .select()
    .from(moodEntries)
    .orderBy(desc(moodEntries.createdAt), desc(moodEntries.date));
  return rows.map(toEntryRecord);
}

export async function getEntriesByDateRange(startDate: string, endDate: string): Promise<MoodEntryRecord[]> {
  const rows = await db
    .select()
    .from(moodEntries)
    .where(between(moodEntries.date, startDate, endDate))
    .orderBy(desc(moodEntries.createdAt), desc(moodEntries.date));
  return rows.map(toEntryRecord);
}

export async function getEntryById(entryId: number): Promise<MoodEntryRecord | null> {
  const row = await db.query.moodEntries.findFirst({
    where: eq(moodEntries.id, entryId),
  });
  return row ? toEntryRecord(row) : null;
}

export async function updateEntry(entryId: number, input: MoodUpdateInput) {
  assertImportantReason(input.is_important, input.important_reason);

  const existing = await db.query.moodEntries.findFirst({
    where: eq(moodEntries.id, entryId),
    columns: { id: true },
  });
  if (!existing) return null;

  if (input.selected_options !== undefined || input.slider_values !== undefined) {
    await validateEntryFields(input.selected_options ?? [], input.slider_values ?? {});
  }

  return db.transaction(async (tx) => {
    const updates: Record<string, unknown> = {};
    if (input.mood !== undefined) updates.mood = input.mood;
    if (input.content !== undefined) updates.content = input.content;
    if (input.date !== undefined) updates.date = input.date;
    if (input.time !== undefined) updates.createdAt = input.time;
    if (input.is_important !== undefined) updates.isImportant = input.is_important;
    if (input.important_reason !== undefined) updates.importantReason = input.important_reason;
    updates.updatedAt = sql`CURRENT_TIMESTAMP`;

    await tx.update(moodEntries).set(updates).where(eq(moodEntries.id, entryId));

    if (input.selected_options !== undefined) {
      await tx.delete(entrySelections).where(eq(entrySelections.entryId, entryId));
      if (input.selected_options.length > 0) {
        await tx.insert(entrySelections).values(
          input.selected_options.map((optionId) => ({ entryId, optionId }))
        );
      }
    }

    if (input.slider_values !== undefined) {
      await tx.delete(entrySliderValues).where(eq(entrySliderValues.entryId, entryId));
      const sliderEntries = Object.entries(input.slider_values);
      if (sliderEntries.length > 0) {
        await tx.insert(entrySliderValues).values(
          sliderEntries.map(([groupId, value]) => ({ entryId, groupId: Number(groupId), value }))
        );
      }
    }
  }).then(async () => {
    const entry = await getEntryById(entryId);
    if (!entry) return null;
    const selections = await getEntrySelections(entryId);
    const sliderValues = await getEntrySliderValues(entryId);
    return { ...entry, selections, slider_values: sliderValues };
  });
}

export async function deleteEntry(entryId: number): Promise<boolean> {
  const result = await db
    .delete(moodEntries)
    .where(eq(moodEntries.id, entryId))
    .returning({ id: moodEntries.id });
  return result.length > 0;
}

async function recalculateAverageMood(entryId: number): Promise<number | null> {
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

export async function addMoodLog(entryId: number, mood: number) {
  const entry = await db.query.moodEntries.findFirst({
    where: eq(moodEntries.id, entryId),
    columns: { id: true },
  });
  if (!entry) throw new ValidationError('Entry not found');

  const [inserted] = await db
    .insert(entryMoodLogs)
    .values({ entryId, mood })
    .returning({ id: entryMoodLogs.id, mood: entryMoodLogs.mood, loggedAt: entryMoodLogs.loggedAt });

  await recalculateAverageMood(entryId);

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

export async function getMoodLogs(entryId: number): Promise<MoodLogRecord[]> {
  const entry = await db.query.moodEntries.findFirst({
    where: eq(moodEntries.id, entryId),
    columns: { id: true },
  });
  if (!entry) throw new ValidationError('Entry not found');

  return db
    .select({
      id: entryMoodLogs.id,
      entry_id: entryMoodLogs.entryId,
      mood: entryMoodLogs.mood,
      logged_at: entryMoodLogs.loggedAt,
    })
    .from(entryMoodLogs)
    .where(eq(entryMoodLogs.entryId, entryId))
    .orderBy(asc(entryMoodLogs.loggedAt));
}

export async function deleteMoodLog(entryId: number, logId: number): Promise<number | null> {
  const entry = await db.query.moodEntries.findFirst({
    where: eq(moodEntries.id, entryId),
    columns: { id: true },
  });
  if (!entry) return null;

  const deleted = await db
    .delete(entryMoodLogs)
    .where(and(eq(entryMoodLogs.id, logId), eq(entryMoodLogs.entryId, entryId)))
    .returning({ id: entryMoodLogs.id });

  if (deleted.length === 0) return null;

  const recalculatedMood = await recalculateAverageMood(entryId);
  if (recalculatedMood !== null) return recalculatedMood;

  const [updatedEntry] = await db
    .select({ mood: moodEntries.mood })
    .from(moodEntries)
    .where(eq(moodEntries.id, entryId));

  return updatedEntry?.mood ?? null;
}

export async function getStatistics() {
  const [statistics, moodDistribution, currentStreak] = await Promise.all([
    getMoodStatistics(),
    getMoodCounts(),
    getCurrentStreak(),
  ]);

  return {
    statistics,
    mood_distribution: moodDistribution,
    current_streak: currentStreak,
  };
}

export async function getExistingEntryDates(): Promise<Set<string>> {
  const rows = await db.selectDistinct({ date: moodEntries.date }).from(moodEntries);
  return new Set(rows.map((r) => r.date));
}

export async function getMoodEntries(): Promise<Entry[]> {
  const rows = await db.query.moodEntries.findMany({
    orderBy: [desc(moodEntries.createdAt), desc(moodEntries.date)],
    with: {
      selections: {
        with: {
          option: {
            with: { group: true },
          },
        },
      },
      sliderValues: {
        with: { group: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    mood: row.mood as MoodValue,
    content: row.content,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    is_important: row.isImportant,
    important_reason: row.importantReason,
    selections: row.selections.map((sel) => ({
      id: sel.option.id,
      name: sel.option.name,
      icon: sel.option.icon ?? null,
      group_id: sel.option.groupId,
      group_color: sel.option.group?.color ?? null,
    })),
    slider_values: row.sliderValues.map((sv) => ({
      id: sv.id,
      group_id: sv.groupId,
      group_name: sv.group?.name ?? '',
      group_color: sv.group?.color ?? null,
      group_icon: sv.group?.icon ?? null,
      value: sv.value,
      slider_min: sv.group?.sliderMin ?? 1,
      slider_max: sv.group?.sliderMax ?? 5,
      slider_labels: sv.group?.sliderLabels ?? null,
    })),
  }));
}

export { getCurrentStreak };
