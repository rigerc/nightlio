import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { moodEntries } from '../db/schema';
import type { DaylioImportPayload } from '@shared/schemas/import';
import { createGroup, createGroupOption, ensureUserGroups } from './group-service';
import { createMoodEntry, ValidationError } from './mood-service';

export interface ImportResult {
  imported: number;
  skipped: number;
}

export async function importDaylioEntries(
  db: Database,
  userId: number,
  payload: DaylioImportPayload
): Promise<ImportResult> {
  await ensureUserGroups(db, userId);

  // Create new groups and build tempId -> realId map
  const groupIdMap = new Map<string, number>();
  for (const ng of payload.new_groups) {
    const realId = await createGroup(db, userId, {
      name: ng.name,
      type: ng.type,
      slider_min: ng.slider_min,
      slider_max: ng.slider_max,
    });
    groupIdMap.set(ng.temp_id, realId);
  }

  // Create new options and build tempId -> realId map
  const optionIdMap = new Map<string, number>();
  for (const no of payload.new_options) {
    let groupId: number;
    if (no.group_temp_id) {
      const resolved = groupIdMap.get(no.group_temp_id);
      if (resolved === undefined) throw new ValidationError(`Unknown group temp_id: ${no.group_temp_id}`);
      groupId = resolved;
    } else if (no.group_id !== undefined) {
      groupId = no.group_id;
    } else {
      throw new ValidationError(`Option "${no.name}" has no group reference`);
    }
    const realId = await createGroupOption(db, userId, groupId, no.name);
    optionIdMap.set(no.temp_id, realId);
  }

  // Fetch existing entry dates for this user
  const existingRows = await db
    .select({ date: moodEntries.date })
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId));
  const existingDates = new Set(existingRows.map((r) => r.date));

  let imported = 0;
  let skipped = 0;

  for (const entry of payload.entries) {
    if (existingDates.has(entry.date)) {
      skipped++;
      continue;
    }

    // Resolve option temp IDs
    const selectedOptions = [
      ...entry.option_ids,
      ...entry.option_temp_ids.map((tid) => {
        const id = optionIdMap.get(tid);
        if (id === undefined) throw new ValidationError(`Unknown option temp_id: ${tid}`);
        return id;
      }),
    ];

    // Resolve slider temp IDs
    const sliderValues: Record<number, number> = { ...entry.slider_values };
    for (const [tempId, value] of Object.entries(entry.slider_temp_values ?? {})) {
      const groupId = groupIdMap.get(tempId);
      if (groupId === undefined) throw new ValidationError(`Unknown group temp_id in slider: ${tempId}`);
      sliderValues[groupId] = value;
    }

    await createMoodEntry(db, userId, {
      mood: entry.mood as 1 | 2 | 3 | 4 | 5,
      date: entry.date,
      content: entry.content,
      time: entry.time,
      selected_options: selectedOptions,
      slider_values: sliderValues,
    });

    existingDates.add(entry.date);
    imported++;
  }

  return { imported, skipped };
}
