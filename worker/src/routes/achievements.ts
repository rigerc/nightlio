import { Hono } from 'hono'
import type { Env } from '../types'
import { authMiddleware } from '../auth'

export const achievementRoutes = new Hono<Env>()

achievementRoutes.use('/*', authMiddleware)

const ACHIEVEMENT_META: Record<string, { name: string; description: string; icon: string; rarity: string }> = {
  first_entry:      { name: 'First Entry',       description: 'Log your first mood entry',       icon: 'Zap',      rarity: 'common' },
  week_warrior:     { name: 'Week Warrior',       description: 'Maintain a 7-day streak',         icon: 'Flame',    rarity: 'uncommon' },
  consistency_king: { name: 'Consistency King',   description: 'Maintain a 30-day streak',        icon: 'Target',   rarity: 'rare' },
  data_lover:       { name: 'Data Lover',         description: 'View statistics 10 times',        icon: 'BarChart3',rarity: 'uncommon' },
  mood_master:      { name: 'Mood Master',        description: 'Log 100 total entries',           icon: 'Crown',    rarity: 'legendary' },
}

// GET /api/achievements
achievementRoutes.get('/achievements', async (c) => {
  const userId = c.get('userId')
  const rows = await c.env.DB.prepare(
    `SELECT id, achievement_type, earned_at FROM achievements
      WHERE user_id = ? ORDER BY earned_at DESC`,
  ).bind(userId).all<{ id: number; achievement_type: string; earned_at: string }>()

  return c.json(rows.results.map(r => ({ ...r, ...(ACHIEVEMENT_META[r.achievement_type] ?? {}) })))
})

// POST /api/achievements/check  (must be before /achievements/:id)
achievementRoutes.post('/achievements/check', async (c) => {
  const userId = c.get('userId')
  const newTypes = await checkAndAward(c.env.DB, userId)
  const newAchievements = newTypes.map(t => ({ achievement_type: t, ...(ACHIEVEMENT_META[t] ?? {}) }))
  return c.json({ new_achievements: newAchievements, count: newAchievements.length })
})

// GET /api/achievements/progress  (must be before /achievements/:id)
achievementRoutes.get('/achievements/progress', async (c) => {
  const userId = c.get('userId')

  const [statsRow, metricsRow] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as total FROM mood_entries WHERE user_id = ?').bind(userId).first<{ total: number }>(),
    c.env.DB.prepare('SELECT stats_views FROM user_metrics WHERE user_id = ?').bind(userId).first<{ stats_views: number }>(),
  ])

  const total = statsRow?.total ?? 0
  const views = metricsRow?.stats_views ?? 0
  const streak = await getCurrentStreak(c.env.DB, userId)

  const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max))
  return c.json({
    first_entry:      { current: clamp(total, 1),   max: 1 },
    week_warrior:     { current: clamp(streak, 7),  max: 7 },
    consistency_king: { current: clamp(streak, 30), max: 30 },
    data_lover:       { current: clamp(views, 10),  max: 10 },
    mood_master:      { current: clamp(total, 100), max: 100 },
  })
})

async function checkAndAward(db: D1Database, userId: number): Promise<string[]> {
  const [statsRow, metricsRow] = await Promise.all([
    db.prepare('SELECT COUNT(*) as total FROM mood_entries WHERE user_id = ?').bind(userId).first<{ total: number }>(),
    db.prepare('SELECT stats_views FROM user_metrics WHERE user_id = ?').bind(userId).first<{ stats_views: number }>(),
  ])

  const total = statsRow?.total ?? 0
  const views = metricsRow?.stats_views ?? 0
  const streak = await getCurrentStreak(db, userId)

  const candidates: [string, boolean][] = [
    ['first_entry', total >= 1],
    ['week_warrior', streak >= 7],
    ['consistency_king', streak >= 30],
    ['data_lover', views >= 10],
    ['mood_master', total >= 100],
  ]

  const earned: string[] = []
  for (const [type, cond] of candidates) {
    if (!cond) continue
    const r = await db.prepare(
      'INSERT OR IGNORE INTO achievements (user_id, achievement_type) VALUES (?, ?)',
    ).bind(userId, type).run()
    if (r.meta.changes) earned.push(type)
  }
  return earned
}

async function getCurrentStreak(db: D1Database, userId: number): Promise<number> {
  const rows = await db.prepare(
    'SELECT DISTINCT date FROM mood_entries WHERE user_id = ? ORDER BY date DESC',
  ).bind(userId).all<{ date: string }>()

  if (!rows.results.length) return 0

  const dates = rows.results
    .map(r => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return new Date(r.date + 'T00:00:00Z')
      const p = r.date.split('/')
      if (p.length === 3) return new Date(`${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}T00:00:00Z`)
      return null
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())

  if (!dates.length) return 0

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const mostRecent = new Date(dates[0])
  mostRecent.setUTCHours(0, 0, 0, 0)
  if (Math.round((today.getTime() - mostRecent.getTime()) / 86400000) > 1) return 0

  let streak = 0
  let expected = new Date(mostRecent)
  for (const d of dates) {
    d.setUTCHours(0, 0, 0, 0)
    if (d.getTime() === expected.getTime()) {
      streak++
      expected = new Date(expected.getTime() - 86400000)
    } else break
  }
  return streak
}
