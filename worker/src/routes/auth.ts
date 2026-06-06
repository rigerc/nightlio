import { Hono } from 'hono'
import type { Env } from '../types'
import { signJwt, authMiddleware } from '../auth'

type UserRow = { id: number; name: string; email: string; avatar_url: string | null }

export const authRoutes = new Hono<Env>()

authRoutes.post('/google', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Google OAuth not configured' }, 400)
  }
  const body = await c.req.json<{ token?: string }>().catch(() => ({}))
  if (!body.token) return c.json({ error: 'Google token is required' }, 400)

  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.token}`)
  if (!resp.ok) return c.json({ error: 'Invalid Google token' }, 401)
  const info = await resp.json() as Record<string, string>
  if (info.aud !== c.env.GOOGLE_CLIENT_ID) return c.json({ error: 'Invalid Google token' }, 401)

  const user = await upsertUser(c.env.DB, info.sub, info.email, info.name, info.picture ?? null)
  if (!user) return c.json({ error: 'Authentication failed' }, 500)

  const token = await signJwt(user.id, c.env.JWT_SECRET)
  return c.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } })
})

authRoutes.post('/local/login', async (c) => {
  const selfHostId = c.env.DEFAULT_SELF_HOST_ID || 'selfhost_default_user'
  const name = c.env.SELFHOST_USER_NAME || 'Me'
  const email = c.env.SELFHOST_USER_EMAIL || `${selfHostId}@localhost`

  const user = await upsertUser(c.env.DB, selfHostId, email, name, null)
  if (!user) return c.json({ error: 'Authentication failed' }, 500)

  const token = await signJwt(user.id, c.env.JWT_SECRET)
  return c.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } })
})

authRoutes.post('/verify', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB
    .prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRow>()
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } })
})

async function upsertUser(
  db: D1Database,
  googleId: string,
  email: string,
  name: string,
  avatarUrl: string | null,
): Promise<UserRow | null> {
  await db.prepare(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(google_id) DO UPDATE SET
       email      = COALESCE(excluded.email,      users.email),
       name       = COALESCE(excluded.name,       users.name),
       avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
       last_login = CURRENT_TIMESTAMP`,
  ).bind(googleId, email, name, avatarUrl).run()

  return db
    .prepare('SELECT id, name, email, avatar_url FROM users WHERE google_id = ?')
    .bind(googleId)
    .first<UserRow>()
}
