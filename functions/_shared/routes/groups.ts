import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import {
  groupCreateSchema,
  groupUpdateSchema,
  optionCreateSchema,
  optionUpdateSchema,
  reorderRequestSchema,
} from '@shared/schemas/groups';
import {
  ValidationError,
  createGroup,
  createGroupOption,
  deleteGroup,
  deleteGroupOption,
  getAllGroups,
  reorderGroupOptions,
  reorderGroups,
  updateGroup,
  updateGroupOption,
} from '../services/group-service';

const groupIdParamSchema = z.object({ group_id: z.coerce.number().int() });
const optionIdParamSchema = z.object({ option_id: z.coerce.number().int() });

export const groupRoutes = new Hono<AppEnv>();

function asValidationError<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    if (err instanceof ValidationError) {
      throw new HTTPException(400, { message: err.message });
    }
    throw err;
  });
}

groupRoutes.get('/groups', async (c) => {
  const db = createDb(c.env.DB);
  return c.json(await getAllGroups(db));
});

groupRoutes.post('/groups', zValidator('json', groupCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  const groupId = await asValidationError(() => createGroup(db, body));
  return c.json({ status: 'success', group_id: groupId, message: 'Group created successfully' }, 201);
});

groupRoutes.post('/groups/reorder', zValidator('json', reorderRequestSchema), async (c) => {
  const { ordered_ids: orderedIds } = c.req.valid('json');
  const db = createDb(c.env.DB);

  await reorderGroups(db, orderedIds);
  return c.json({ status: 'success' });
});

groupRoutes.patch('/groups/:group_id', zValidator('param', groupIdParamSchema), zValidator('json', groupUpdateSchema), async (c) => {
  const { group_id: groupId } = c.req.valid('param');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  if (Object.keys(body).length === 0) {
    throw new HTTPException(400, { message: 'No valid fields to update' });
  }

  const success = await asValidationError(() => updateGroup(db, groupId, body));
  if (!success) {
    throw new HTTPException(404, { message: 'Group not found' });
  }
  return c.json({ status: 'success', message: 'Group updated successfully' });
});

groupRoutes.delete('/groups/:group_id', zValidator('param', groupIdParamSchema), async (c) => {
  const { group_id: groupId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const success = await deleteGroup(db, groupId);
  if (!success) {
    throw new HTTPException(404, { message: 'Group not found' });
  }
  return c.json({ status: 'success', message: 'Group deleted successfully' });
});

groupRoutes.post('/groups/:group_id/options', zValidator('param', groupIdParamSchema), zValidator('json', optionCreateSchema), async (c) => {
  const { group_id: groupId } = c.req.valid('param');
  const { name } = c.req.valid('json');
  const db = createDb(c.env.DB);

  const optionId = await asValidationError(() => createGroupOption(db, groupId, name));
  return c.json({ status: 'success', option_id: optionId, message: 'Option created successfully' }, 201);
});

groupRoutes.post(
  '/groups/:group_id/options/reorder',
  zValidator('param', groupIdParamSchema),
  zValidator('json', reorderRequestSchema),
  async (c) => {
    const { group_id: groupId } = c.req.valid('param');
    const { ordered_ids: orderedIds } = c.req.valid('json');
    const db = createDb(c.env.DB);

    await reorderGroupOptions(db, groupId, orderedIds);
    return c.json({ status: 'success' });
  }
);

groupRoutes.patch('/options/:option_id', zValidator('param', optionIdParamSchema), zValidator('json', optionUpdateSchema), async (c) => {
  const { option_id: optionId } = c.req.valid('param');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  if (Object.keys(body).length === 0) {
    throw new HTTPException(400, { message: 'No valid fields to update' });
  }

  const success = await asValidationError(() => updateGroupOption(db, optionId, body));
  if (!success) {
    throw new HTTPException(404, { message: 'Option not found' });
  }
  return c.json({ status: 'success', message: 'Option updated successfully' });
});

groupRoutes.delete('/options/:option_id', zValidator('param', optionIdParamSchema), async (c) => {
  const { option_id: optionId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const success = await deleteGroupOption(db, optionId);
  if (!success) {
    throw new HTTPException(404, { message: 'Option not found' });
  }
  return c.json({ status: 'success', message: 'Option deleted successfully' });
});
