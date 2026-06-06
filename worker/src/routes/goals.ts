import { Hono } from 'hono'
import type { Env } from '../types'
import { authMiddleware } from '../auth'

export const goalRoutes = new Hono<Env>()

goalRoutes.use('/*', authMiddleware)

type GoalRow = {
  id: number; user_id: number; title: string; description: string | null
  frequency_per_week: number; completed: number; streak: number
  period_start: string | null; last_completed_date: string | null
  created_at: string; updated_at: string
}

function weekStartISO(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun
  const offset = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setUTCDate(now.getUTCDate() + offset)
  return mon.toISOString().slice(0, 10)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

async function rolloverIfNeeded(db: D1Database, goal: GoalRow): Promise<GoalRow & { already_completed_today: boolean }> {
  const todayStart = weekStartISO()
  const todayStr = todayISO()

  if ((goal.period_start ?? '') === todayStart) {
    return { ...goal, already_completed_today: goal.last_completed_date === todayStr }
  }

  const freq = goal.frequency_per_week ?? 0
  const completed = goal.completed ?? 0
  const newStreak = freq > 0 && completed >= freq ? (goal.streak ?? 0) + 1 : 0

  await db.prepare(
    `UPDATE goals SET completed = 0, streak = ?, period_start = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
  ).bind(newStreak, todayStart, goal.id, goal.user_id).run()

  const refreshed = await db.prepare(
    `SELECT id, user_id, title, description, frequency_per_week, completed, streak,
            period_start, last_completed_date, created_at, updated_at
       FROM goals WHERE id = ? AND user_id = ?`,
  ).bind(goal.id, goal.user_id).first<GoalRow>()

  const out = refreshed ?? { ...goal, completed: 0, streak: newStreak, period_start: todayStart }
  return { ...out, already_completed_today: out.last_completed_date === todayStr }
}

// GET /api/goals
goalRoutes.get('/goals', async (c) => {
  const userId = c.get('userId')
  const rows = await c.env.DB.prepare(
    `SELECT id, user_id, title, description, frequency_per_week, completed, streak,
            period_start, last_completed_date, created_at, updated_at
       FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
  ).bind(userId).all<GoalRow>()

  const goals = await Promise.all(rows.results.map(g => rolloverIfNeeded(c.env.DB, g)))
  return c.json(goals)
})

// POST /api/goals
goalRoutes.post('/goals', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{
    title?: string; description?: string; frequency_per_week?: number; frequency?: number | string
  }>().catch(() => null)

  if (!body) return c.json({ error: 'Invalid request body' }, 400)
  const title = (body.title ?? '').trim()
  if (!title) return c.json({ error: 'Title is required' }, 400)

  const freq = body.frequency_per_week ?? (body.frequency ? parseInt(String(body.frequency), 10) : NaN)
  if (!Number.isInteger(freq) || freq < 1 || freq > 7) {
    return c.json({ error: 'frequency_per_week must be between 1 and 7' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO goals (user_id, title, description, frequency_per_week, completed, streak, period_start)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
  ).bind(userId, title, (body.description ?? '').trim(), freq, weekStartISO()).run()

  return c.json({ id: result.meta.last_row_id }, 201)
})

// GET /api/goals/:id
goalRoutes.get('/goals/:id', async (c) => {
  const userId = c.get('userId')
  const goalId = Number(c.req.param('id'))
  const row = await c.env.DB.prepare(
    `SELECT id, user_id, title, description, frequency_per_week, completed, streak,
            period_start, last_completed_date, created_at, updated_at
       FROM goals WHERE id = ? AND user_id = ?`,
  ).bind(goalId, userId).first<GoalRow>()

  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(await rolloverIfNeeded(c.env.DB, row))
})

// PUT /api/goals/:id  (also PATCH)
goalRoutes.put('/goals/:id', handleUpdateGoal)
goalRoutes.patch('/goals/:id', handleUpdateGoal)

async function handleUpdateGoal(c: Parameters<Parameters<typeof goalRoutes.put>[1]>[0]) {
  const userId = c.get('userId')
  const goalId = Number(c.req.param('id'))
  const body = await c.req.json<{
    title?: string; description?: string; frequency_per_week?: number; frequency?: number | string
  }>().catch(() => null)

  if (!body) return c.json({ error: 'Invalid request body' }, 400)

  const updates: string[] = []
  const params: unknown[] = []

  if (body.title !== undefined) {
    updates.push('title = ?')
    params.push(body.title.trim())
  }
  if (body.description !== undefined) {
    updates.push('description = ?')
    params.push(body.description.trim())
  }

  const rawFreq = body.frequency_per_week ?? (body.frequency !== undefined ? parseInt(String(body.frequency), 10) : undefined)
  if (rawFreq !== undefined && !isNaN(rawFreq)) {
    if (rawFreq < 1 || rawFreq > 7) return c.json({ error: 'frequency_per_week must be between 1 and 7' }, 400)
    updates.push('frequency_per_week = ?')
    params.push(rawFreq)
    updates.push('completed = MIN(completed, ?)')
    params.push(rawFreq)
  }

  if (!updates.length) return c.json({ error: 'No update fields provided' }, 400)
  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(goalId, userId)

  const result = await c.env.DB.prepare(
    `UPDATE goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
  ).bind(...params).run()

  if (!result.meta.changes) return c.json({ error: 'No changes or goal not found' }, 404)
  return c.json({ status: 'ok' })
}

// DELETE /api/goals/:id
goalRoutes.delete('/goals/:id', async (c) => {
  const userId = c.get('userId')
  const goalId = Number(c.req.param('id'))
  const result = await c.env.DB.prepare(
    'DELETE FROM goals WHERE id = ? AND user_id = ?',
  ).bind(goalId, userId).run()
  if (!result.meta.changes) return c.json({ error: 'Not found' }, 404)
  return c.json({ status: 'ok' })
})

// POST /api/goals/:id/progress
goalRoutes.post('/goals/:id/progress', async (c) => {
  const userId = c.get('userId')
  const goalId = Number(c.req.param('id'))
  const todayStr = todayISO()

  const row = await c.env.DB.prepare(
    `SELECT id, user_id, title, description, frequency_per_week, completed, streak,
            period_start, last_completed_date, created_at, updated_at
       FROM goals WHERE id = ? AND user_id = ?`,
  ).bind(goalId, userId).first<GoalRow>()
  if (!row) return c.json({ error: 'Not found' }, 404)

  const goal = await rolloverIfNeeded(c.env.DB, row)
  let { completed, streak, period_start, last_completed_date } = goal
  const freq = goal.frequency_per_week

  if (last_completed_date !== todayStr && completed < freq) {
    completed++
    last_completed_date = todayStr
  } else if (last_completed_date !== todayStr) {
    last_completed_date = todayStr
  }

  await c.env.DB.prepare(
    `UPDATE goals SET completed = ?, streak = ?, period_start = ?, last_completed_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
  ).bind(completed, streak, period_start, last_completed_date, goalId, userId).run()

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO goal_completions (user_id, goal_id, date) VALUES (?, ?, ?)',
  ).bind(userId, goalId, todayStr).run()

  const updated = await c.env.DB.prepare(
    `SELECT id, user_id, title, description, frequency_per_week, completed, streak,
            period_start, last_completed_date, created_at, updated_at
       FROM goals WHERE id = ? AND user_id = ?`,
  ).bind(goalId, userId).first<GoalRow>()

  if (!updated) return c.json({ error: 'Not found' }, 404)
  return c.json({ ...updated, already_completed_today: updated.last_completed_date === todayStr })
})

// GET /api/goals/:id/completions  (also /api/goal/:id/completions)
goalRoutes.get('/goals/:id/completions', handleGetCompletions)
goalRoutes.get('/goal/:id/completions', handleGetCompletions)

async function handleGetCompletions(c: Parameters<Parameters<typeof goalRoutes.get>[1]>[0]) {
  const userId = c.get('userId')
  const goalId = Number(c.req.param('id'))
  let start = c.req.query('start')
  let end = c.req.query('end')

  if (!start || !end) {
    const now = new Date()
    const endDate = now.toISOString().slice(0, 10)
    const startDate = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10)
    start = startDate
    end = endDate
  }

  const result = await c.env.DB.prepare(
    `SELECT date FROM goal_completions
      WHERE user_id = ? AND goal_id = ? AND date BETWEEN ? AND ?
      ORDER BY date ASC`,
  ).bind(userId, goalId, start, end).all()

  return c.json(result.results)
}
