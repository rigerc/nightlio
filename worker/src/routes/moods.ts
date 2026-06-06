import { Hono } from 'hono'
import type { Env } from '../types'
import { authMiddleware } from '../auth'

export const moodRoutes = new Hono<Env>()

moodRoutes.use('/*', authMiddleware)

// POST /api/mood
moodRoutes.post('/mood', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{
    mood: number; date: string; content: string; time?: string; selected_options?: number[]
  }>().catch(() => null)

  if (!body) return c.json({ error: 'Invalid request body' }, 400)
  if (!body.mood || body.mood < 1 || body.mood > 5) return c.json({ error: 'Mood must be between 1 and 5' }, 400)
  if (!body.content?.trim()) return c.json({ error: 'Content cannot be empty' }, 400)
  if (!body.date) return c.json({ error: 'Date is required' }, 400)

  const result = body.time
    ? await c.env.DB.prepare(
        'INSERT INTO mood_entries (user_id, date, mood, content, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(userId, body.date, body.mood, body.content, body.time).run()
    : await c.env.DB.prepare(
        'INSERT INTO mood_entries (user_id, date, mood, content) VALUES (?, ?, ?, ?)',
      ).bind(userId, body.date, body.mood, body.content).run()

  const entryId = result.meta.last_row_id

  if (body.selected_options?.length) {
    await c.env.DB.batch(
      body.selected_options.map(optId =>
        c.env.DB.prepare('INSERT INTO entry_selections (entry_id, option_id) VALUES (?, ?)').bind(entryId, optId),
      ),
    )
  }

  const newAchievements = await checkAchievements(c.env.DB, userId)
  return c.json({ status: 'success', entry_id: entryId, new_achievements: newAchievements, message: 'Mood entry created successfully' }, 201)
})

// GET /api/moods
moodRoutes.get('/moods', async (c) => {
  const userId = c.get('userId')
  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')

  const entries = startDate && endDate
    ? await c.env.DB.prepare(
        'SELECT id, date, mood, content, created_at, updated_at FROM mood_entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY created_at DESC, date DESC',
      ).bind(userId, startDate, endDate).all()
    : await c.env.DB.prepare(
        'SELECT id, date, mood, content, created_at, updated_at FROM mood_entries WHERE user_id = ? ORDER BY created_at DESC, date DESC',
      ).bind(userId).all()

  return c.json(entries.results)
})

// GET /api/mood/:id
moodRoutes.get('/mood/:id', async (c) => {
  const userId = c.get('userId')
  const entryId = Number(c.req.param('id'))
  const entry = await c.env.DB.prepare(
    'SELECT id, date, mood, content, created_at, updated_at FROM mood_entries WHERE id = ? AND user_id = ?',
  ).bind(entryId, userId).first()
  if (!entry) return c.json({ error: 'Entry not found' }, 404)
  return c.json(entry)
})

// PUT /api/mood/:id
moodRoutes.put('/mood/:id', async (c) => {
  const userId = c.get('userId')
  const entryId = Number(c.req.param('id'))
  const body = await c.req.json<{
    mood?: number; content?: string; date?: string; time?: string; selected_options?: number[]
  }>().catch(() => null)

  if (!body) return c.json({ error: 'Invalid request body' }, 400)
  if (body.mood !== undefined && (body.mood < 1 || body.mood > 5)) {
    return c.json({ error: 'Mood must be between 1 and 5' }, 400)
  }
  if (body.content !== undefined && !body.content.trim()) {
    return c.json({ error: 'Content cannot be empty' }, 400)
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM mood_entries WHERE id = ? AND user_id = ?',
  ).bind(entryId, userId).first()
  if (!existing) return c.json({ error: 'Entry not found' }, 404)

  const updates: string[] = []
  const params: unknown[] = []
  if (body.mood !== undefined) { updates.push('mood = ?'); params.push(body.mood) }
  if (body.content !== undefined) { updates.push('content = ?'); params.push(body.content) }
  if (body.date !== undefined) { updates.push('date = ?'); params.push(body.date) }
  if (body.time !== undefined) { updates.push('created_at = ?'); params.push(body.time) }
  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(entryId, userId)

  await c.env.DB.prepare(
    `UPDATE mood_entries SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
  ).bind(...params).run()

  if (body.selected_options !== undefined) {
    await c.env.DB.prepare('DELETE FROM entry_selections WHERE entry_id = ?').bind(entryId).run()
    if (body.selected_options.length > 0) {
      await c.env.DB.batch(
        body.selected_options.map(optId =>
          c.env.DB.prepare('INSERT INTO entry_selections (entry_id, option_id) VALUES (?, ?)').bind(entryId, optId),
        ),
      )
    }
  }

  const updated = await c.env.DB.prepare(
    'SELECT id, date, mood, content, created_at, updated_at FROM mood_entries WHERE id = ? AND user_id = ?',
  ).bind(entryId, userId).first()

  const selections = await c.env.DB.prepare(
    `SELECT go.id, go.name, go.icon, g.name as group_name, g.color as group_color
       FROM entry_selections es
       JOIN group_options go ON es.option_id = go.id
       JOIN groups g ON go.group_id = g.id
      WHERE es.entry_id = ?
      ORDER BY g.sort_order ASC, g.name, go.sort_order ASC, go.name`,
  ).bind(entryId).all()

  return c.json({ status: 'success', message: 'Mood entry updated successfully', entry: { ...updated, selections: selections.results } })
})

// DELETE /api/mood/:id
moodRoutes.delete('/mood/:id', async (c) => {
  const userId = c.get('userId')
  const entryId = Number(c.req.param('id'))
  const result = await c.env.DB.prepare(
    'DELETE FROM mood_entries WHERE id = ? AND user_id = ?',
  ).bind(entryId, userId).run()
  if (!result.meta.changes) return c.json({ error: 'Entry not found' }, 404)
  return c.json({ status: 'success', message: 'Mood entry deleted successfully' })
})

// GET /api/statistics
moodRoutes.get('/statistics', async (c) => {
  const userId = c.get('userId')

  // Track stats view for Data Lover achievement
  await c.env.DB.prepare(
    `INSERT INTO user_metrics (user_id, stats_views) VALUES (?, 1)
     ON CONFLICT(user_id) DO UPDATE SET stats_views = stats_views + 1, updated_at = CURRENT_TIMESTAMP`,
  ).bind(userId).run()

  const statsRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total_entries, AVG(mood) as average_mood,
            MIN(mood) as lowest_mood, MAX(mood) as highest_mood,
            MIN(date) as first_entry_date, MAX(date) as last_entry_date
       FROM mood_entries WHERE user_id = ?`,
  ).bind(userId).first<Record<string, number | string | null>>()

  const statistics = statsRow && Number(statsRow.total_entries) > 0
    ? {
        total_entries: statsRow.total_entries,
        average_mood: statsRow.average_mood !== null ? Math.round(Number(statsRow.average_mood) * 100) / 100 : 0,
        lowest_mood: statsRow.lowest_mood,
        highest_mood: statsRow.highest_mood,
        first_entry_date: statsRow.first_entry_date,
        last_entry_date: statsRow.last_entry_date,
      }
    : { total_entries: 0, average_mood: 0, lowest_mood: null, highest_mood: null, first_entry_date: null, last_entry_date: null }

  const moodCountRows = await c.env.DB.prepare(
    'SELECT mood, COUNT(*) as count FROM mood_entries WHERE user_id = ? GROUP BY mood ORDER BY mood',
  ).bind(userId).all<{ mood: number; count: number }>()

  const moodDistribution: Record<number, number> = {}
  for (const row of moodCountRows.results) moodDistribution[row.mood] = row.count

  const streak = await getCurrentStreak(c.env.DB, userId)

  return c.json({ statistics, mood_distribution: moodDistribution, current_streak: streak })
})

// GET /api/streak
moodRoutes.get('/streak', async (c) => {
  const userId = c.get('userId')
  const streak = await getCurrentStreak(c.env.DB, userId)
  return c.json({ current_streak: streak, message: `Current streak: ${streak} day${streak !== 1 ? 's' : ''}` })
})

// GET /api/mood/:id/selections
moodRoutes.get('/mood/:id/selections', async (c) => {
  const userId = c.get('userId')
  const entryId = Number(c.req.param('id'))
  const entry = await c.env.DB.prepare(
    'SELECT id FROM mood_entries WHERE id = ? AND user_id = ?',
  ).bind(entryId, userId).first()
  if (!entry) return c.json([])

  const result = await c.env.DB.prepare(
    `SELECT go.id, go.name, go.icon, g.name as group_name, g.color as group_color
       FROM entry_selections es
       JOIN group_options go ON es.option_id = go.id
       JOIN groups g ON go.group_id = g.id
      WHERE es.entry_id = ?
      ORDER BY g.sort_order ASC, g.name, go.sort_order ASC, go.name`,
  ).bind(entryId).all()

  return c.json(result.results)
})

async function getCurrentStreak(db: D1Database, userId: number): Promise<number> {
  const rows = await db.prepare(
    'SELECT DISTINCT date FROM mood_entries WHERE user_id = ? ORDER BY date DESC',
  ).bind(userId).all<{ date: string }>()

  if (!rows.results.length) return 0

  const dates = rows.results
    .map(r => {
      // Handle both YYYY-MM-DD and MM/DD/YYYY formats
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return new Date(r.date + 'T00:00:00Z')
      const parts = r.date.split('/')
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}T00:00:00Z`)
      return null
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())

  if (!dates.length) return 0

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const mostRecent = dates[0]
  mostRecent.setUTCHours(0, 0, 0, 0)

  const diffDays = Math.round((today.getTime() - mostRecent.getTime()) / 86400000)
  if (diffDays > 1) return 0

  let streak = 0
  let expected = new Date(mostRecent)
  for (const d of dates) {
    d.setUTCHours(0, 0, 0, 0)
    if (d.getTime() === expected.getTime()) {
      streak++
      expected = new Date(expected.getTime() - 86400000)
    } else {
      break
    }
  }
  return streak
}

async function checkAchievements(db: D1Database, userId: number): Promise<string[]> {
  const [statsRow, metricsRow] = await Promise.all([
    db.prepare(
      'SELECT COUNT(*) as total FROM mood_entries WHERE user_id = ?',
    ).bind(userId).first<{ total: number }>(),
    db.prepare(
      'SELECT stats_views FROM user_metrics WHERE user_id = ?',
    ).bind(userId).first<{ stats_views: number }>(),
  ])

  const total = statsRow?.total ?? 0
  const statsViews = metricsRow?.stats_views ?? 0
  const streak = await getCurrentStreak(db, userId)

  const candidates: [string, boolean][] = [
    ['first_entry', total >= 1],
    ['week_warrior', streak >= 7],
    ['consistency_king', streak >= 30],
    ['data_lover', statsViews >= 10],
    ['mood_master', total >= 100],
  ]

  const newAchievements: string[] = []
  for (const [type, condition] of candidates) {
    if (!condition) continue
    const result = await db.prepare(
      'INSERT OR IGNORE INTO achievements (user_id, achievement_type) VALUES (?, ?)',
    ).bind(userId, type).run()
    if (result.meta.changes) newAchievements.push(type)
  }
  return newAchievements
}
