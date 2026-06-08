import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import { goalCreateSchema, goalUpdateSchema } from '@shared/schemas/goals';
import {
  ValidationError,
  createGoal,
  deleteGoal,
  getGoalById,
  getGoalCompletions,
  getGoals,
  incrementGoalProgress,
  updateGoal,
} from '../services/goal-service';

const goalIdParamSchema = z.object({ goal_id: z.coerce.number().int() });
const completionsQuerySchema = z.object({ start: z.string().optional(), end: z.string().optional() });

export const goalRoutes = new Hono<AppEnv>();

goalRoutes.get('/goals', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  return c.json(await getGoals(db, userId));
});

goalRoutes.post('/goals', zValidator('json', goalCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  const title = body.title.trim();
  if (!title) {
    throw new HTTPException(400, { message: 'Title is required' });
  }

  try {
    const goalId = await createGoal(db, userId, { ...body, title });
    return c.json({ id: goalId }, 201);
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new HTTPException(400, { message: err.message });
    }
    throw err;
  }
});

goalRoutes.get('/goals/:goal_id', zValidator('param', goalIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { goal_id: goalId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const goal = await getGoalById(db, userId, goalId);
  if (!goal) {
    throw new HTTPException(404, { message: 'Not found' });
  }
  return c.json(goal);
});

async function handleUpdateGoal(
  db: ReturnType<typeof createDb>,
  userId: number,
  goalId: number,
  body: z.infer<typeof goalUpdateSchema>
) {
  const frequency = body.frequency_per_week ?? body.frequency;

  try {
    const success = await updateGoal(db, userId, goalId, { ...body, frequency_per_week: frequency });
    if (!success) {
      throw new HTTPException(404, { message: 'No changes or goal not found' });
    }
    return { status: 'ok' as const };
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    if (err instanceof ValidationError) {
      throw new HTTPException(400, { message: err.message });
    }
    throw err;
  }
}

goalRoutes.put(
  '/goals/:goal_id',
  zValidator('param', goalIdParamSchema),
  zValidator('json', goalUpdateSchema),
  async (c) => {
    const userId = c.get('userId');
    const { goal_id: goalId } = c.req.valid('param');
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    return c.json(await handleUpdateGoal(db, userId, goalId, body));
  }
);
goalRoutes.patch(
  '/goals/:goal_id',
  zValidator('param', goalIdParamSchema),
  zValidator('json', goalUpdateSchema),
  async (c) => {
    const userId = c.get('userId');
    const { goal_id: goalId } = c.req.valid('param');
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    return c.json(await handleUpdateGoal(db, userId, goalId, body));
  }
);

goalRoutes.delete('/goals/:goal_id', zValidator('param', goalIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { goal_id: goalId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const success = await deleteGoal(db, userId, goalId);
  if (!success) {
    throw new HTTPException(404, { message: 'Not found' });
  }
  return c.json({ status: 'ok' });
});

goalRoutes.post('/goals/:goal_id/progress', zValidator('param', goalIdParamSchema), async (c) => {
  const userId = c.get('userId');
  const { goal_id: goalId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const updated = await incrementGoalProgress(db, userId, goalId);
  if (!updated) {
    throw new HTTPException(404, { message: 'Not found' });
  }
  return c.json(updated);
});

goalRoutes.get(
  '/goals/:goal_id/completions',
  zValidator('param', goalIdParamSchema),
  zValidator('query', completionsQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const { goal_id: goalId } = c.req.valid('param');
    const { start, end } = c.req.valid('query');
    const db = createDb(c.env.DB);
    return c.json(await getGoalCompletions(db, userId, goalId, start, end));
  }
);
goalRoutes.get(
  '/goal/:goal_id/completions',
  zValidator('param', goalIdParamSchema),
  zValidator('query', completionsQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const { goal_id: goalId } = c.req.valid('param');
    const { start, end } = c.req.valid('query');
    const db = createDb(c.env.DB);
    return c.json(await getGoalCompletions(db, userId, goalId, start, end));
  }
);
