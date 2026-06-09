import { asc, eq, and, isNull, inArray } from 'drizzle-orm';
import { toBatch, type Database } from '../db/client';
import { entrySelections, entrySliderValues, groupOptions, groups, moodEntries } from '../db/schema';
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

type GroupRow = typeof groups.$inferSelect;

async function cloneGroupForUser(
  db: Database,
  userId: number,
  template: GroupRow
): Promise<{ groupId: number; optionIdMap: Map<number, number> }> {
  const [inserted] = await db
    .insert(groups)
    .values({
      userId,
      name: template.name,
      color: template.color,
      icon: template.icon,
      sortOrder: template.sortOrder,
      type: template.type,
      sliderMin: template.sliderMin,
      sliderMax: template.sliderMax,
      sliderLabels: template.sliderLabels,
    })
    .returning({ id: groups.id });

  const optionIdMap = new Map<number, number>();
  const options = await db
    .select()
    .from(groupOptions)
    .where(eq(groupOptions.groupId, template.id))
    .orderBy(asc(groupOptions.sortOrder), asc(groupOptions.id));

  for (const option of options) {
    const [newOption] = await db
      .insert(groupOptions)
      .values({
        groupId: inserted.id,
        name: option.name,
        icon: option.icon,
        sortOrder: option.sortOrder,
      })
      .returning({ id: groupOptions.id });
    optionIdMap.set(option.id, newOption.id);
  }

  return { groupId: inserted.id, optionIdMap };
}

async function cloneDefaultGroupsForUser(db: Database, userId: number): Promise<void> {
  const existingGroups = await db.select({ name: groups.name }).from(groups).where(eq(groups.userId, userId));
  const existingNames = new Set(existingGroups.map((group) => group.name.toLowerCase()));
  const templates = await db.select().from(groups).where(isNull(groups.userId)).orderBy(asc(groups.sortOrder), asc(groups.id));
  for (const template of templates) {
    if (existingNames.has(template.name.toLowerCase())) continue;
    await cloneGroupForUser(db, userId, template);
  }
}

async function userHasGlobalGroupReferences(db: Database, userId: number): Promise<boolean> {
  const [selectionRef] = await db
    .select({ id: entrySelections.id })
    .from(entrySelections)
    .innerJoin(moodEntries, eq(entrySelections.entryId, moodEntries.id))
    .innerJoin(groupOptions, eq(entrySelections.optionId, groupOptions.id))
    .innerJoin(groups, eq(groupOptions.groupId, groups.id))
    .where(and(eq(moodEntries.userId, userId), isNull(groups.userId)))
    .limit(1);
  if (selectionRef) return true;

  const [sliderRef] = await db
    .select({ id: entrySliderValues.id })
    .from(entrySliderValues)
    .innerJoin(moodEntries, eq(entrySliderValues.entryId, moodEntries.id))
    .innerJoin(groups, eq(entrySliderValues.groupId, groups.id))
    .where(and(eq(moodEntries.userId, userId), isNull(groups.userId)))
    .limit(1);
  return Boolean(sliderRef);
}

async function migrateGlobalGroupReferencesForUser(db: Database, userId: number): Promise<void> {
  const selectionRefs = await db
    .select({ selectionId: entrySelections.id, optionId: entrySelections.optionId, groupId: groups.id })
    .from(entrySelections)
    .innerJoin(moodEntries, eq(entrySelections.entryId, moodEntries.id))
    .innerJoin(groupOptions, eq(entrySelections.optionId, groupOptions.id))
    .innerJoin(groups, eq(groupOptions.groupId, groups.id))
    .where(and(eq(moodEntries.userId, userId), isNull(groups.userId)));

  const sliderRefs = await db
    .select({ sliderValueId: entrySliderValues.id, groupId: entrySliderValues.groupId })
    .from(entrySliderValues)
    .innerJoin(moodEntries, eq(entrySliderValues.entryId, moodEntries.id))
    .innerJoin(groups, eq(entrySliderValues.groupId, groups.id))
    .where(and(eq(moodEntries.userId, userId), isNull(groups.userId)));

  const referencedGroupIds = [...new Set([
    ...selectionRefs.map((ref) => ref.groupId),
    ...sliderRefs.map((ref) => ref.groupId),
  ])];
  if (referencedGroupIds.length === 0) return;

  const templates = await db
    .select()
    .from(groups)
    .where(and(isNull(groups.userId), inArray(groups.id, referencedGroupIds)))
    .orderBy(asc(groups.sortOrder), asc(groups.id));

  const groupIdMap = new Map<number, number>();
  const optionIdMap = new Map<number, number>();
  for (const template of templates) {
    const cloned = await cloneGroupForUser(db, userId, template);
    groupIdMap.set(template.id, cloned.groupId);
    for (const [oldOptionId, newOptionId] of cloned.optionIdMap) {
      optionIdMap.set(oldOptionId, newOptionId);
    }
  }

  for (const ref of selectionRefs) {
    const newOptionId = optionIdMap.get(ref.optionId);
    if (newOptionId !== undefined) {
      await db.update(entrySelections).set({ optionId: newOptionId }).where(eq(entrySelections.id, ref.selectionId));
    }
  }

  for (const ref of sliderRefs) {
    const newGroupId = groupIdMap.get(ref.groupId);
    if (newGroupId !== undefined) {
      await db.update(entrySliderValues).set({ groupId: newGroupId }).where(eq(entrySliderValues.id, ref.sliderValueId));
    }
  }
}

export async function ensureUserGroups(db: Database, userId: number): Promise<void> {
  const existing = await db.query.groups.findFirst({ where: eq(groups.userId, userId), columns: { id: true } });
  if (existing) return;

  if (await userHasGlobalGroupReferences(db, userId)) {
    await migrateGlobalGroupReferencesForUser(db, userId);
  }

  await cloneDefaultGroupsForUser(db, userId);
}

export async function getAllGroups(db: Database, userId: number): Promise<GroupRecord[]> {
  await ensureUserGroups(db, userId);
  const groupRows = await db.select().from(groups).where(eq(groups.userId, userId)).orderBy(asc(groups.sortOrder), asc(groups.name));

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

export async function createGroup(db: Database, userId: number, input: GroupCreateInput): Promise<number> {
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
        userId,
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
    .values({ userId, name: input.name.trim(), type: 'category' })
    .returning({ id: groups.id });
  return inserted.id;
}

export async function createGroupOption(db: Database, userId: number, groupId: number, name: string): Promise<number> {
  if (!name.trim()) {
    throw new ValidationError('Option name cannot be empty');
  }
  const group = await db.query.groups.findFirst({ where: and(eq(groups.id, groupId), eq(groups.userId, userId)), columns: { id: true } });
  if (!group) throw new ValidationError('Group not found');

  const [inserted] = await db
    .insert(groupOptions)
    .values({ groupId, name: name.trim() })
    .returning({ id: groupOptions.id });
  return inserted.id;
}

export async function updateGroup(db: Database, userId: number, groupId: number, fields: GroupUpdateInput): Promise<boolean> {
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

  if (Object.keys(updates).length === 0) {
    return false;
  }

  const touchesSliderConfig =
    fields.type === 'slider' ||
    fields.slider_min !== undefined ||
    fields.slider_max !== undefined ||
    fields.slider_labels !== undefined;
  if (touchesSliderConfig) {
    const existing = await db.query.groups.findFirst({
      where: and(eq(groups.id, groupId), eq(groups.userId, userId)),
      columns: { type: true, sliderMin: true, sliderMax: true, sliderLabels: true },
    });
    if (!existing) return false;

    const nextType = fields.type ?? existing.type;
    if (nextType === 'slider') {
      validateSliderFields({
        slider_min: fields.slider_min ?? existing.sliderMin,
        slider_max: fields.slider_max ?? existing.sliderMax,
        slider_labels: fields.slider_labels === undefined ? existing.sliderLabels : fields.slider_labels,
      });
    }
  }

  const result = await db.update(groups).set(updates).where(and(eq(groups.id, groupId), eq(groups.userId, userId))).returning({ id: groups.id });
  return result.length > 0;
}

export async function updateGroupOption(db: Database, userId: number, optionId: number, fields: OptionUpdateInput): Promise<boolean> {
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

  const allowed = await db
    .select({ id: groupOptions.id })
    .from(groupOptions)
    .innerJoin(groups, eq(groupOptions.groupId, groups.id))
    .where(and(eq(groupOptions.id, optionId), eq(groups.userId, userId)));
  if (allowed.length === 0) return false;

  const result = await db.update(groupOptions).set(updates).where(eq(groupOptions.id, optionId)).returning({ id: groupOptions.id });
  return result.length > 0;
}

export async function reorderGroups(db: Database, userId: number, orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const allowed = await db.select({ id: groups.id }).from(groups).where(and(eq(groups.userId, userId), inArray(groups.id, orderedIds)));
  if (allowed.length !== new Set(orderedIds).size) throw new ValidationError('One or more groups were not found');

  const statements = orderedIds.map((groupId, index) =>
    db.update(groups).set({ sortOrder: index }).where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
  );
  await db.batch(toBatch(statements));
}

export async function reorderGroupOptions(db: Database, userId: number, groupId: number, orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const group = await db.query.groups.findFirst({ where: and(eq(groups.id, groupId), eq(groups.userId, userId)), columns: { id: true } });
  if (!group) throw new ValidationError('Group not found');

  const allowed = await db.select({ id: groupOptions.id }).from(groupOptions).where(and(eq(groupOptions.groupId, groupId), inArray(groupOptions.id, orderedIds)));
  if (allowed.length !== new Set(orderedIds).size) throw new ValidationError('One or more options were not found');

  const statements = orderedIds.map((optionId, index) =>
    db
      .update(groupOptions)
      .set({ sortOrder: index })
      .where(and(eq(groupOptions.id, optionId), eq(groupOptions.groupId, groupId)))
  );
  await db.batch(toBatch(statements));
}

export async function deleteGroup(db: Database, userId: number, groupId: number): Promise<boolean> {
  const result = await db.delete(groups).where(and(eq(groups.id, groupId), eq(groups.userId, userId))).returning({ id: groups.id });
  return result.length > 0;
}

export async function deleteGroupOption(db: Database, userId: number, optionId: number): Promise<boolean> {
  const allowed = await db
    .select({ id: groupOptions.id })
    .from(groupOptions)
    .innerJoin(groups, eq(groupOptions.groupId, groups.id))
    .where(and(eq(groupOptions.id, optionId), eq(groups.userId, userId)));
  if (allowed.length === 0) return false;

  const result = await db.delete(groupOptions).where(eq(groupOptions.id, optionId)).returning({ id: groupOptions.id });
  return result.length > 0;
}
