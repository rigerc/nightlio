import { asc, eq, and } from 'drizzle-orm';
import type { Database } from '../db/client';
import { groupOptions, groups } from '../db/schema';
import type { GroupCreateInput, GroupUpdateInput, OptionUpdateInput } from '@shared/schemas/groups';

export class ValidationError extends Error {}

export interface GroupOptionRecord {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface GroupRecord {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  type: 'category' | 'slider';
  slider_min: number | null;
  slider_max: number | null;
  slider_labels: string[] | null;
  options: GroupOptionRecord[];
}

interface SliderFields {
  slider_min?: number | null;
  slider_max?: number | null;
  slider_labels?: string[] | null;
}

function validateSliderFields(fields: SliderFields): void {
  const { slider_min: sliderMin, slider_max: sliderMax, slider_labels: sliderLabels } = fields;

  if (sliderMin != null && sliderMax != null && sliderMin >= sliderMax) {
    throw new ValidationError('slider_min must be less than slider_max');
  }

  if (sliderLabels != null && sliderMin != null && sliderMax != null) {
    const expected = sliderMax - sliderMin + 1;
    if (sliderLabels.length !== expected) {
      throw new ValidationError(`slider_labels must contain exactly ${expected} entries for the given range`);
    }
  }
}

export async function getAllGroups(db: Database): Promise<GroupRecord[]> {
  const groupRows = await db.select().from(groups).orderBy(asc(groups.sortOrder), asc(groups.name));

  const result: GroupRecord[] = [];
  for (const group of groupRows) {
    let options: GroupOptionRecord[] = [];
    if (group.type !== 'slider') {
      const optionRows = await db
        .select({ id: groupOptions.id, name: groupOptions.name, icon: groupOptions.icon, sort_order: groupOptions.sortOrder })
        .from(groupOptions)
        .where(eq(groupOptions.groupId, group.id))
        .orderBy(asc(groupOptions.sortOrder), asc(groupOptions.name));
      options = optionRows;
    }

    result.push({
      id: group.id,
      name: group.name,
      color: group.color,
      icon: group.icon,
      sort_order: group.sortOrder,
      type: group.type,
      slider_min: group.sliderMin,
      slider_max: group.sliderMax,
      slider_labels: group.sliderLabels,
      options,
    });
  }

  return result;
}

export async function createGroup(db: Database, input: GroupCreateInput): Promise<number> {
  if (!input.name.trim()) {
    throw new ValidationError('Group name cannot be empty');
  }

  const type = input.type ?? 'category';

  if (type === 'slider') {
    const sliderMin = input.slider_min ?? 1;
    const sliderMax = input.slider_max ?? 5;
    validateSliderFields({ slider_min: sliderMin, slider_max: sliderMax, slider_labels: input.slider_labels ?? null });

    const [inserted] = await db
      .insert(groups)
      .values({
        name: input.name.trim(),
        type: 'slider',
        sliderMin,
        sliderMax,
        sliderLabels: input.slider_labels ?? null,
      })
      .returning({ id: groups.id });
    return inserted.id;
  }

  const [inserted] = await db
    .insert(groups)
    .values({ name: input.name.trim(), type: 'category' })
    .returning({ id: groups.id });
  return inserted.id;
}

export async function createGroupOption(db: Database, groupId: number, name: string): Promise<number> {
  if (!name.trim()) {
    throw new ValidationError('Option name cannot be empty');
  }
  const [inserted] = await db
    .insert(groupOptions)
    .values({ groupId, name: name.trim() })
    .returning({ id: groupOptions.id });
  return inserted.id;
}

export async function updateGroup(db: Database, groupId: number, fields: GroupUpdateInput): Promise<boolean> {
  const updates: Record<string, unknown> = {};

  if (fields.name !== undefined) {
    if (!fields.name.trim()) {
      throw new ValidationError('Group name cannot be empty');
    }
    updates.name = fields.name.trim();
  }
  if (fields.color !== undefined) updates.color = fields.color;
  if (fields.icon !== undefined) updates.icon = fields.icon;
  if (fields.sort_order !== undefined) updates.sortOrder = fields.sort_order;
  if (fields.type !== undefined) updates.type = fields.type;
  if (fields.slider_min !== undefined) updates.sliderMin = fields.slider_min;
  if (fields.slider_max !== undefined) updates.sliderMax = fields.slider_max;
  if (fields.slider_labels !== undefined) updates.sliderLabels = fields.slider_labels;

  validateSliderFields(fields);

  if (Object.keys(updates).length === 0) {
    return false;
  }

  const result = await db.update(groups).set(updates).where(eq(groups.id, groupId)).returning({ id: groups.id });
  return result.length > 0;
}

export async function updateGroupOption(db: Database, optionId: number, fields: OptionUpdateInput): Promise<boolean> {
  const updates: Record<string, unknown> = {};

  if (fields.name !== undefined) {
    if (!fields.name.trim()) {
      throw new ValidationError('Option name cannot be empty');
    }
    updates.name = fields.name.trim();
  }
  if (fields.icon !== undefined) updates.icon = fields.icon;
  if (fields.sort_order !== undefined) updates.sortOrder = fields.sort_order;

  if (Object.keys(updates).length === 0) {
    return false;
  }

  const result = await db.update(groupOptions).set(updates).where(eq(groupOptions.id, optionId)).returning({ id: groupOptions.id });
  return result.length > 0;
}

export async function reorderGroups(db: Database, orderedIds: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, groupId] of orderedIds.entries()) {
      await tx.update(groups).set({ sortOrder: index }).where(eq(groups.id, groupId));
    }
  });
}

export async function reorderGroupOptions(db: Database, groupId: number, orderedIds: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, optionId] of orderedIds.entries()) {
      await tx
        .update(groupOptions)
        .set({ sortOrder: index })
        .where(and(eq(groupOptions.id, optionId), eq(groupOptions.groupId, groupId)));
    }
  });
}

export async function deleteGroup(db: Database, groupId: number): Promise<boolean> {
  const result = await db.delete(groups).where(eq(groups.id, groupId)).returning({ id: groups.id });
  return result.length > 0;
}

export async function deleteGroupOption(db: Database, optionId: number): Promise<boolean> {
  const result = await db.delete(groupOptions).where(eq(groupOptions.id, optionId)).returning({ id: groupOptions.id });
  return result.length > 0;
}
