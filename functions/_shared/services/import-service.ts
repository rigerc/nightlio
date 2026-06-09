import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { moodEntries } from '../db/schema';
import type { DaylioImportPayload, DaylioPreparePayload } from '@shared/schemas/import';
import { createGroup, createGroupOption, ensureUserGroups } from './group-service';
import { createMoodEntry, finalizeImportBatch, ValidationError } from './mood-service';

export interface PrepareResult {
  groupIds: Record<string, number>;
  optionIds: Record<string, number>;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export async function prepareDaylioImport(
  db: Database,
  userId: number,
  payload: DaylioPreparePayload
): Promise<PrepareResult> {
  await ensureUserGroups(db, userId);

  const groupIds: Record<string, number> = {};
  for (const ng of payload.new_groups) {
    groupIds[ng.temp_id] = await createGroup(db, userId, {
      name: ng.name,
      type: ng.type,
      slider_min: ng.slider_min,
      slider_max: ng.slider_max,
    });
  }

  const optionIds: Record<string, number> = {};
  for (const no of payload.new_options) {
    let groupId: number;
    if (no.group_temp_id) {
      const resolved = groupIds[no.group_temp_id];
      if (resolved === undefined) throw new ValidationError(`Unknown group temp_id: ${no.group_temp_id}`);
      groupId = resolved;
    } else if (no.group_id !== undefined) {
      groupId = no.group_id;
    } else {
      throw new ValidationError(`Option "${no.name}" has no group reference`);
    }
    optionIds[no.temp_id] = await createGroupOption(db, userId, groupId, no.name);
  }

  return { groupIds, optionIds };
}

export async function importDaylioEntries(
  db: Database,
  userId: number,
  payload: DaylioImportPayload
): Promise<ImportResult> {
  // Entries may still carry temp references when the client skipped the
  // prepare step (small imports); resolve them here.
  const { groupIds, optionIds } = await prepareDaylioImport(db, userId, {
    new_groups: payload.new_groups,
    new_options: payload.new_options,
  });

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
        const id = optionIds[tid];
        if (id === undefined) throw new ValidationError(`Unknown option temp_id: ${tid}`);
        return id;
      }),
    ];

    // Resolve slider temp IDs
    const sliderValues: Record<number, number> = { ...entry.slider_values };
    for (const [tempId, value] of Object.entries(entry.slider_temp_values ?? {})) {
      const groupId = groupIds[tempId];
      if (groupId === undefined) throw new ValidationError(`Unknown group temp_id in slider: ${tempId}`);
      sliderValues[groupId] = value;
    }

    await createMoodEntry(
      db,
      userId,
      {
        mood: entry.mood as 1 | 2 | 3 | 4 | 5,
        date: entry.date,
        content: entry.content,
        time: entry.time,
        selected_options: selectedOptions,
        slider_values: sliderValues,
      },
      { batchMode: true }
    );

    existingDates.add(entry.date);
    imported++;
  }

  // One achievements pass per import keeps large imports within Cloudflare's
  // per-request subrequest budget.
  if (imported > 0) {
    await finalizeImportBatch(db, userId);
  }

  return { imported, skipped };
}
