import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { JwtTokenExpired, JwtTokenInvalid } from 'hono/utils/jwt/types';
import type { AppEnv } from '../lib/env';
import { verifyToken } from '../lib/jwt';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Authorization header required' });
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const userId = Number(payload.user_id);
    if (!Number.isFinite(userId)) {
      throw new HTTPException(401, { message: 'Invalid token payload' });
    }
    c.set('userId', userId);
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    if (err instanceof JwtTokenExpired) {
      throw new HTTPException(401, { message: 'Token expired' });
    }
    if (err instanceof JwtTokenInvalid) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    throw new HTTPException(401, { message: 'Invalid token' });
  }

  await next();
});
