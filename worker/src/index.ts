import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { authRoutes } from './routes/auth'
import { moodRoutes } from './routes/moods'
import { goalRoutes } from './routes/goals'
import { groupRoutes } from './routes/groups'
import { achievementRoutes } from './routes/achievements'
import { preferenceRoutes } from './routes/preferences'
import { configRoutes } from './routes/config'

const app = new Hono<Env>()

app.use('/api/*', async (c, next) => {
  const origins = (c.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  return cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })(c, next)
})

app.route('/api', configRoutes)
app.route('/api/auth', authRoutes)
app.route('/api', moodRoutes)
app.route('/api', goalRoutes)
app.route('/api', groupRoutes)
app.route('/api', achievementRoutes)
app.route('/api', preferenceRoutes)

app.notFound(c => c.json({ error: 'Not Found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app
