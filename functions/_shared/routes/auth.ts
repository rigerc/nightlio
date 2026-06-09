import { verifyToken as verifyClerkToken } from '@clerk/backend';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { JwtTokenExpired, JwtTokenInvalid } from 'hono/utils/jwt/types';
import type { AppEnv } from '../lib/env';
import { createDb } from '../db/client';
import { generateToken, verifyToken } from '../lib/jwt';
import { jwtExpiresInSeconds } from '../lib/env';
import { googleAuthRequestSchema } from '@shared/schemas/auth';
import {
  ensureLocalUser,
  getOrCreateClerkUser,
  getOrCreateUser,
  getUserById,
  type UserRecord,
} from '../services/user-service';

export const authRoutes = new Hono<AppEnv>();

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  aud: string;
  [key: string]: unknown;
}

async function verifyGoogleToken(token: string, expectedClientId: string): Promise<GoogleUserInfo | null> {
  try {
    const url = new URL('https://oauth2.googleapis.com/tokeninfo');
    url.searchParams.set('id_token', token);
    const resp = await fetch(url.toString());
    if (!resp.ok) return null;
    const userInfo = (await resp.json()) as GoogleUserInfo;
    if (userInfo.aud !== expectedClientId) return null;
    return userInfo;
  } catch (err) {
    console.error('Google token verification error:', err);
    return null;
  }
}

function toUserOut(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatarUrl,
  };
}

function isLocalRequest(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function setAuthCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, 'waymark_token', token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: !isLocalRequest(c.req.url),
    path: '/',
    maxAge: jwtExpiresInSeconds(c.env),
  });
}

function clearAuthCookie(c: Context<AppEnv>): void {
  deleteCookie(c, 'waymark_token', { path: '/' });
}

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < maxLength; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
}

function authorizedParties(raw: string | undefined): string[] | undefined {
  const values = raw?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  return values.length > 0 ? values : undefined;
}

function stringClaim(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

authRoutes.post('/auth/google', zValidator('json', googleAuthRequestSchema), async (c) => {
  const { token } = c.req.valid('json');
  const clientId = c.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new HTTPException(400, { message: 'Google OAuth not configured' });
  }

  const userInfo = await verifyGoogleToken(token, clientId);
  if (!userInfo) {
    throw new HTTPException(401, { message: 'Invalid Google token' });
  }

  const db = createDb(c.env.DB);
  const user = await getOrCreateUser(db, userInfo.sub, userInfo.email, userInfo.name, userInfo.picture ?? null);
  if (!user) {
    throw new HTTPException(500, { message: 'Authentication failed' });
  }

  const authToken = await generateToken(user.id, c.env.JWT_SECRET, jwtExpiresInSeconds(c.env));
  setAuthCookie(c, authToken);
  return c.json({ token: authToken, user: toUserOut(user) });
});

authRoutes.post('/auth/verify', async (c) => {
  const header = c.req.header('Authorization');
  const cookieToken = getCookie(c, 'waymark_token');
  const token = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : cookieToken;
  if (!token) {
    throw new HTTPException(401, { message: 'Authorization header required' });
  }

  try {
    const db = createDb(c.env.DB);

    if (c.env.CLERK_JWT_KEY) {
      try {
        const clerkPayload = await verifyClerkToken(token, {
          jwtKey: c.env.CLERK_JWT_KEY,
          authorizedParties: authorizedParties(c.env.CLERK_AUTHORIZED_PARTIES),
        });
        const clerkUserId = stringClaim(clerkPayload.sub);
        if (clerkUserId) {
          const user = await getOrCreateClerkUser(
            db,
            clerkUserId,
            stringClaim(clerkPayload.email) ?? stringClaim(clerkPayload.email_address),
            stringClaim(clerkPayload.name) ?? stringClaim(clerkPayload.full_name) ?? stringClaim(clerkPayload.first_name),
            stringClaim(clerkPayload.picture) ?? stringClaim(clerkPayload.image_url)
          );
          if (!user) throw new HTTPException(500, { message: 'Authentication failed' });
          return c.json({ user: toUserOut(user) });
        }
      } catch {
        // Fall back to legacy JWT below during staged migrations.
      }
    }

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const user = await getUserById(db, Number(payload.user_id));
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }
    return c.json({ user: toUserOut(user) });
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
});

authRoutes.post('/auth/local/login', async (c) => {
  if (!isLocalRequest(c.req.url)) {
    const expectedAccessKey = c.env.SELFHOST_ACCESS_KEY;
    if (!expectedAccessKey) {
      throw new HTTPException(403, { message: 'Self-host local login requires SELFHOST_ACCESS_KEY outside localhost' });
    }

    const body = await c.req.json().catch(() => ({})) as { access_key?: unknown };
    const providedAccessKey = typeof body.access_key === 'string' ? body.access_key : '';
    if (!constantTimeEqual(providedAccessKey, expectedAccessKey)) {
      throw new HTTPException(401, { message: 'Invalid self-host access key' });
    }
  }

  const defaultSelfHostId = c.env.DEFAULT_SELF_HOST_ID ?? 'self-host-user';
  const defaultName = c.env.SELFHOST_USER_NAME || 'Me';
  const defaultEmail = c.env.SELFHOST_USER_EMAIL || `${defaultSelfHostId}@localhost`;

  const db = createDb(c.env.DB);
  const user = await ensureLocalUser(db, defaultSelfHostId, defaultName, defaultEmail);
  if (!user) {
    throw new HTTPException(500, { message: 'Authentication failed' });
  }

  const authToken = await generateToken(user.id, c.env.JWT_SECRET, jwtExpiresInSeconds(c.env));
  setAuthCookie(c, authToken);
  return c.json({ token: authToken, user: toUserOut(user) });
});

authRoutes.post('/auth/logout', (c) => {
  clearAuthCookie(c);
  return c.json({ status: 'ok' });
});
