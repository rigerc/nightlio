import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { groups, groupOptions } from '../db/schema';
import type { Group, GroupType } from '../types';

export class ValidationError extends Error {}

function toGroupRecord(row: typeof groups.$inferSelect, options: typeof groupOptions.$inferSelect[]): Group {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    sort_order: row.sortOrder,
    type: row.type,
    slider_min: row.sliderMin ?? undefined,
    slider_max: row.sliderMax ?? undefined,
    slider_labels: row.sliderLabels,
    options: options.map((opt) => ({
      id: opt.id,
      group_id: opt.groupId,
      name: opt.name,
      icon: opt.icon ?? undefined,
      sort_order: opt.sortOrder,
    })),
  };
}

export async function getGroups(): Promise<Group[]> {
  const rows = await db.query.groups.findMany({
    with: { options: { orderBy: [asc(groupOptions.sortOrder), asc(groupOptions.name)] } },
    orderBy: [asc(groups.sortOrder), asc(groups.name)],
  });

  return rows.map((row) => toGroupRecord(row, row.options));
}

export interface CreateGroupInput {
  name: string;
  type?: GroupType;
  color?: string;
  icon?: string;
  slider_min?: number;
  slider_max?: number;
  slider_labels?: string[] | null;
}

export async function createGroup(input: CreateGroupInput): Promise<number> {
  if (!input.name.trim()) {
    throw new ValidationError('Group name is required');
  }

  const [maxSort] = await db
    .select({ max: groups.sortOrder })
    .from(groups)
    .orderBy(desc(groups.sortOrder))
    .limit(1);

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [inserted] = await db
    .insert(groups)
    .values({
      name: input.name.trim(),
      type: input.type ?? 'category',
      color: input.color,
      icon: input.icon,
      sortOrder,
      sliderMin: input.slider_min ?? 1,
      sliderMax: input.slider_max ?? 5,
      sliderLabels: input.slider_labels ?? null,
    })
    .returning({ id: groups.id });

  return inserted.id;
}

export async function updateGroup(
  groupId: number,
  data: Partial<{
    name: string;
    color: string;
    icon: string;
    sort_order: number;
    type: GroupType;
    slider_min: number;
    slider_max: number;
    slider_labels: string[] | null;
  }>
): Promise<boolean> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.color !== undefined) updates.color = data.color;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.sort_order !== undefined) updates.sortOrder = data.sort_order;
  if (data.type !== undefined) updates.type = data.type;
  if (data.slider_min !== undefined) updates.sliderMin = data.slider_min;
  if (data.slider_max !== undefined) updates.sliderMax = data.slider_max;
  if (data.slider_labels !== undefined) updates.sliderLabels = data.slider_labels;

  if (Object.keys(updates).length === 0) return false;

  const result = await db
    .update(groups)
    .set(updates)
    .where(eq(groups.id, groupId))
    .returning({ id: groups.id });

  return result.length > 0;
}

export async function deleteGroup(groupId: number): Promise<boolean> {
  const result = await db
    .delete(groups)
    .where(eq(groups.id, groupId))
    .returning({ id: groups.id });
  return result.length > 0;
}

export async function createGroupOption(groupId: number, name: string): Promise<number> {
  if (!name.trim()) throw new ValidationError('Option name is required');

  const existing = await db.query.groupOptions.findMany({
    where: eq(groupOptions.groupId, groupId),
    columns: { sortOrder: true },
  });
  const sortOrder = existing.length > 0 ? Math.max(...existing.map((o) => o.sortOrder)) + 1 : 0;

  const [inserted] = await db
    .insert(groupOptions)
    .values({ groupId, name: name.trim(), sortOrder })
    .returning({ id: groupOptions.id });

  return inserted.id;
}

export async function updateGroupOption(
  optionId: number,
  data: Partial<{ name: string; icon: string; sort_order: number }>
): Promise<boolean> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.sort_order !== undefined) updates.sortOrder = data.sort_order;

  if (Object.keys(updates).length === 0) return false;

  const result = await db
    .update(groupOptions)
    .set(updates)
    .where(eq(groupOptions.id, optionId))
    .returning({ id: groupOptions.id });

  return result.length > 0;
}

export async function deleteGroupOption(optionId: number): Promise<boolean> {
  const result = await db
    .delete(groupOptions)
    .where(eq(groupOptions.id, optionId))
    .returning({ id: groupOptions.id });
  return result.length > 0;
}

export async function reorderGroups(orderedIds: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(groups).set({ sortOrder: i }).where(eq(groups.id, orderedIds[i]));
    }
  });
}

export async function reorderGroupOptions(groupId: number, orderedIds: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(groupOptions)
        .set({ sortOrder: i })
        .where(eq(groupOptions.id, orderedIds[i]));
    }
  });
}
