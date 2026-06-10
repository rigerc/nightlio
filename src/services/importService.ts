import { db } from '../db/client';
import { groups, groupOptions, moodEntries, entrySelections, entrySliderValues, entryMoodLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { DaylioImportPayload } from '../shared/schemas/import';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function executeDaylioImport(payload: DaylioImportPayload): Promise<ImportResult> {
  const groupIds: Record<string, number> = {};
  const optionIds: Record<string, number> = {};
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  // Create new groups
  for (const newGroup of payload.new_groups) {
    try {
      const [maxSort] = await db
        .select({ sortOrder: groups.sortOrder })
        .from(groups)
        .orderBy(groups.sortOrder)
        .limit(1);

      const sortOrder = maxSort ? maxSort.sortOrder + 1 : 0;

      const [inserted] = await db
        .insert(groups)
        .values({
          name: newGroup.name,
          type: newGroup.type,
          sliderMin: newGroup.slider_min ?? 1,
          sliderMax: newGroup.slider_max ?? 5,
          sortOrder,
        })
        .returning({ id: groups.id });
      groupIds[newGroup.temp_id] = inserted.id;
    } catch (err) {
      errors.push(`Failed to create group "${newGroup.name}": ${String(err)}`);
    }
  }

  // Create new options
  for (const newOption of payload.new_options) {
    try {
      const groupId = newOption.group_id ?? (newOption.group_temp_id ? groupIds[newOption.group_temp_id] : undefined);
      if (!groupId) {
        errors.push(`Option "${newOption.name}": no valid group found`);
        continue;
      }
      const [inserted] = await db
        .insert(groupOptions)
        .values({ groupId, name: newOption.name, sortOrder: 0 })
        .returning({ id: groupOptions.id });
      optionIds[newOption.temp_id] = inserted.id;
    } catch (err) {
      errors.push(`Failed to create option "${newOption.name}": ${String(err)}`);
    }
  }

  // Import entries
  for (const entry of payload.entries) {
    try {
      const resolvedOptionIds = [
        ...entry.option_ids,
        ...entry.option_temp_ids.map((tid) => {
          const id = optionIds[tid];
          if (!id) throw new Error(`No resolved ID for option temp_id "${tid}"`);
          return id;
        }),
      ];

      const resolvedSliderValues: Record<number, number> = { ...entry.slider_values };
      for (const [tempId, value] of Object.entries(entry.slider_temp_values)) {
        const groupId = groupIds[tempId];
        if (!groupId) throw new Error(`No resolved ID for group temp_id "${tempId}"`);
        resolvedSliderValues[groupId] = value;
      }

      await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(moodEntries)
          .values({
            date: entry.date,
            mood: entry.mood,
            content: entry.content,
            ...(entry.time ? { createdAt: entry.time } : {}),
          })
          .returning({ id: moodEntries.id });

        const entryId = inserted.id;

        if (resolvedOptionIds.length > 0) {
          await tx.insert(entrySelections).values(
            resolvedOptionIds.map((optionId) => ({ entryId, optionId, source: 'imported' }))
          );
        }

        const sliderEntries = Object.entries(resolvedSliderValues);
        if (sliderEntries.length > 0) {
          await tx.insert(entrySliderValues).values(
            sliderEntries.map(([groupId, value]) => ({ entryId, groupId: Number(groupId), value }))
          );
        }

        await tx.insert(entryMoodLogs).values({
          entryId,
          mood: entry.mood,
          ...(entry.time ? { loggedAt: entry.time } : {}),
        });
      });

      imported += 1;
    } catch (err) {
      errors.push(`Failed to import entry for ${entry.date}: ${String(err)}`);
      skipped += 1;
    }
  }

  return { imported, skipped, errors };
}
