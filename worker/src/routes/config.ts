import { Hono } from 'hono'
import type { Env } from '../types'

export const configRoutes = new Hono<Env>()

// GET /api/config  — public, no auth required
configRoutes.get('/config', (c) => {
  const isTruthy = (v?: string) => ['1', 'true', 'yes', 'on'].includes((v ?? '').toLowerCase().trim())

  return c.json({
    enable_google_oauth:  isTruthy(c.env.ENABLE_GOOGLE_OAUTH),
    enable_mood_music:    false,
    enable_google_health: false,
    google_client_id:     c.env.GOOGLE_CLIENT_ID ?? null,
    google_health_client_id: null,
  })
})

// GET /api/  — health check
configRoutes.get('/', (c) =>
  c.json({ status: 'healthy', message: 'Waymark API is running', timestamp: Date.now() / 1000 }),
)

// GET /api/time
configRoutes.get('/time', (c) => c.json({ time: Date.now() / 1000 }))
