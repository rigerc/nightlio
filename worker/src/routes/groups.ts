import { Hono } from 'hono'
import type { Env } from '../types'
import { authMiddleware } from '../auth'

export const groupRoutes = new Hono<Env>()

// Groups are shared (not per-user) — auth required but no user scoping
groupRoutes.use('/*', authMiddleware)

// GET /api/groups
groupRoutes.get('/groups', async (c) => {
  const groups = await c.env.DB.prepare(
    'SELECT id, name, color, icon, sort_order FROM groups ORDER BY sort_order ASC, name ASC',
  ).all<{ id: number; name: string; color: string | null; icon: string | null; sort_order: number }>()

  const options = await c.env.DB.prepare(
    'SELECT id, group_id, name, icon, sort_order FROM group_options ORDER BY group_id, sort_order ASC, name ASC',
  ).all<{ id: number; group_id: number; name: string; icon: string | null; sort_order: number }>()

  const optionsByGroup: Record<number, typeof options.results> = {}
  for (const opt of options.results) {
    if (!optionsByGroup[opt.group_id]) optionsByGroup[opt.group_id] = []
    optionsByGroup[opt.group_id].push(opt)
  }

  return c.json(groups.results.map(g => ({ ...g, options: optionsByGroup[g.id] ?? [] })))
})

// POST /api/groups
groupRoutes.post('/groups', async (c) => {
  const body = await c.req.json<{ name?: string }>().catch(() => ({}))
  const name = (body.name ?? '').trim()
  if (!name) return c.json({ error: 'Group name cannot be empty' }, 400)

  const result = await c.env.DB.prepare('INSERT INTO groups (name) VALUES (?)').bind(name).run()
  return c.json({ status: 'success', group_id: result.meta.last_row_id, message: 'Group created successfully' }, 201)
})

// POST /api/groups/reorder  (must be before /groups/:id)
groupRoutes.post('/groups/reorder', async (c) => {
  const body = await c.req.json<{ ordered_ids?: number[] }>().catch(() => ({}))
  if (!Array.isArray(body.ordered_ids)) return c.json({ error: 'ordered_ids must be an array' }, 400)

  await c.env.DB.batch(
    body.ordered_ids.map((id, i) =>
      c.env.DB.prepare('UPDATE groups SET sort_order = ? WHERE id = ?').bind(i, id),
    ),
  )
  return c.json({ status: 'success' })
})

// PATCH /api/groups/:id
groupRoutes.patch('/groups/:id', async (c) => {
  const groupId = Number(c.req.param('id'))
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}))
  const allowed = ['name', 'color', 'icon', 'sort_order']
  const entries = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!entries.length) return c.json({ error: 'No valid fields to update' }, 400)

  if ('name' in body && !(body.name as string)?.toString().trim()) {
    return c.json({ error: 'Group name cannot be empty' }, 400)
  }

  const setClause = entries.map(([k]) => `${k} = ?`).join(', ')
  const values = entries.map(([, v]) => v)
  const result = await c.env.DB.prepare(
    `UPDATE groups SET ${setClause} WHERE id = ?`,
  ).bind(...values, groupId).run()

  if (!result.meta.changes) return c.json({ error: 'Group not found' }, 404)
  return c.json({ status: 'success', message: 'Group updated successfully' })
})

// DELETE /api/groups/:id
groupRoutes.delete('/groups/:id', async (c) => {
  const groupId = Number(c.req.param('id'))
  const result = await c.env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run()
  if (!result.meta.changes) return c.json({ error: 'Group not found' }, 404)
  return c.json({ status: 'success', message: 'Group deleted successfully' })
})

// POST /api/groups/:id/options
groupRoutes.post('/groups/:id/options', async (c) => {
  const groupId = Number(c.req.param('id'))
  const body = await c.req.json<{ name?: string }>().catch(() => ({}))
  const name = (body.name ?? '').trim()
  if (!name) return c.json({ error: 'Option name cannot be empty' }, 400)

  const result = await c.env.DB.prepare(
    'INSERT INTO group_options (group_id, name) VALUES (?, ?)',
  ).bind(groupId, name).run()
  return c.json({ status: 'success', option_id: result.meta.last_row_id, message: 'Option created successfully' }, 201)
})

// POST /api/groups/:id/options/reorder
groupRoutes.post('/groups/:id/options/reorder', async (c) => {
  const groupId = Number(c.req.param('id'))
  const body = await c.req.json<{ ordered_ids?: number[] }>().catch(() => ({}))
  if (!Array.isArray(body.ordered_ids)) return c.json({ error: 'ordered_ids must be an array' }, 400)

  await c.env.DB.batch(
    body.ordered_ids.map((id, i) =>
      c.env.DB.prepare(
        'UPDATE group_options SET sort_order = ? WHERE id = ? AND group_id = ?',
      ).bind(i, id, groupId),
    ),
  )
  return c.json({ status: 'success' })
})

// PATCH /api/options/:id
groupRoutes.patch('/options/:id', async (c) => {
  const optionId = Number(c.req.param('id'))
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}))
  const allowed = ['name', 'icon', 'sort_order']
  const entries = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!entries.length) return c.json({ error: 'No valid fields to update' }, 400)

  if ('name' in body && !(body.name as string)?.toString().trim()) {
    return c.json({ error: 'Option name cannot be empty' }, 400)
  }

  const setClause = entries.map(([k]) => `${k} = ?`).join(', ')
  const values = entries.map(([, v]) => v)
  const result = await c.env.DB.prepare(
    `UPDATE group_options SET ${setClause} WHERE id = ?`,
  ).bind(...values, optionId).run()

  if (!result.meta.changes) return c.json({ error: 'Option not found' }, 404)
  return c.json({ status: 'success', message: 'Option updated successfully' })
})

// DELETE /api/options/:id
groupRoutes.delete('/options/:id', async (c) => {
  const optionId = Number(c.req.param('id'))
  const result = await c.env.DB.prepare('DELETE FROM group_options WHERE id = ?').bind(optionId).run()
  if (!result.meta.changes) return c.json({ error: 'Option not found' }, 404)
  return c.json({ status: 'success', message: 'Option deleted successfully' })
})
