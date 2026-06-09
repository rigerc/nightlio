import { verifyToken as verifyClerkToken } from '@clerk/backend';
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { JwtTokenExpired, JwtTokenInvalid } from 'hono/utils/jwt/types';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import { verifyToken } from '../lib/jwt';
import { getOrCreateClerkUser } from '../services/user-service';

function authorizedParties(raw: string | undefined): string[] | undefined {
  const values = raw?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  return values.length > 0 ? values : undefined;
}

function stringClaim(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

async function tryClerkAuth(c: Parameters<Parameters<typeof createMiddleware<AppEnv>>[0]>[0], token: string): Promise<number | null> {
  if (!c.env.CLERK_JWT_KEY) return null;

  const payload = await verifyClerkToken(token, {
    jwtKey: c.env.CLERK_JWT_KEY,
    authorizedParties: authorizedParties(c.env.CLERK_AUTHORIZED_PARTIES),
  });

  const clerkUserId = stringClaim(payload.sub);
  if (!clerkUserId) {
    throw new HTTPException(401, { message: 'Invalid Clerk token payload' });
  }

  const db = createDb(c.env.DB);
  const user = await getOrCreateClerkUser(
    db,
    clerkUserId,
    stringClaim(payload.email) ?? stringClaim(payload.email_address),
    stringClaim(payload.name) ?? stringClaim(payload.full_name) ?? stringClaim(payload.first_name),
    stringClaim(payload.picture) ?? stringClaim(payload.image_url)
  );
  if (!user) {
    throw new HTTPException(500, { message: 'Authentication failed' });
  }

  return user.id;
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const cookieToken = getCookie(c, 'waymark_token');
  const token = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : cookieToken;
  if (!token) {
    throw new HTTPException(401, { message: 'Authorization header required' });
  }
  try {
    const clerkUserId = await tryClerkAuth(c, token);
    if (clerkUserId !== null) {
      c.set('userId', clerkUserId);
      await next();
      return;
    }
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    if (!c.env.JWT_SECRET) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    // Fall through to legacy JWT verification for staged migrations where both
    // auth systems may be present. Clerk verification failures should not expose
    // details to clients.
  }

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
