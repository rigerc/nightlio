import { Hono } from 'hono'
import type { Env } from '../types'
import { authMiddleware } from '../auth'

export const preferenceRoutes = new Hono<Env>()

preferenceRoutes.use('/*', authMiddleware)

// GET /api/preferences/mood-icons
preferenceRoutes.get('/preferences/mood-icons', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare(
    'SELECT mood_icons FROM user_preferences WHERE user_id = ?',
  ).bind(userId).first<{ mood_icons: string | null }>()

  let icons: Record<string, string> = {}
  if (row?.mood_icons) {
    try { icons = JSON.parse(row.mood_icons) } catch { /* ignore */ }
  }
  return c.json({ icons })
})

// PUT /api/preferences/mood-icons
preferenceRoutes.put('/preferences/mood-icons', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ icons?: Record<string, unknown> }>().catch(() => ({}))

  const validated: Record<string, string> = {}
  for (const [k, v] of Object.entries(body.icons ?? {})) {
    const n = parseInt(k, 10)
    if (Number.isInteger(n) && n >= 1 && n <= 5) {
      validated[String(n)] = String(v)
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO user_preferences (user_id, mood_icons, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET mood_icons = excluded.mood_icons, updated_at = CURRENT_TIMESTAMP`,
  ).bind(userId, JSON.stringify(validated)).run()

  return c.json({ status: 'success', icons: validated })
})

// GET /api/preferences/time-format
preferenceRoutes.get('/preferences/time-format', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare(
    'SELECT use_24_hour_time FROM user_preferences WHERE user_id = ?',
  ).bind(userId).first<{ use_24_hour_time: number }>()

  return c.json({ use_24_hour_time: Boolean(row?.use_24_hour_time) })
})

// PUT /api/preferences/time-format
preferenceRoutes.put('/preferences/time-format', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ use_24_hour_time?: boolean }>().catch(() => ({}))
  const use24 = Boolean(body.use_24_hour_time)

  await c.env.DB.prepare(
    `INSERT INTO user_preferences (user_id, use_24_hour_time, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET use_24_hour_time = excluded.use_24_hour_time, updated_at = CURRENT_TIMESTAMP`,
  ).bind(userId, use24 ? 1 : 0).run()

  return c.json({ status: 'success', use_24_hour_time: use24 })
})
