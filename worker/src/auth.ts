import { createMiddleware } from 'hono/factory'
import { SignJWT, jwtVerify } from 'jose'
import type { Env } from './types'

const JWT_EXPIRES_SECONDS = 3600

export async function signJwt(userId: number, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ user_id: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRES_SECONDS}s`)
    .sign(key)
}

export async function verifyJwt(token: string, secret: string): Promise<{ user_id: number }> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return payload as { user_id: number }
}

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header required' }, 401)
  }
  const token = auth.slice(7)
  try {
    const payload = await verifyJwt(token, c.env.JWT_SECRET)
    c.set('userId', payload.user_id)
    await next()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    return c.json({ error: msg.includes('expired') ? 'Token expired' : 'Invalid token' }, 401)
  }
})
