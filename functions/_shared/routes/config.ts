import { Hono } from 'hono';
import type { AppEnv } from '../lib/env';
import { isTruthy } from '../lib/env';

export const configRoutes = new Hono<AppEnv>();

function isLocalRequest(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

configRoutes.get('/config', (c) => {
  const localLoginRequiresAccessKey = !isLocalRequest(c.req.url);

  return c.json({
    enable_google_oauth: isTruthy(c.env.ENABLE_GOOGLE_OAUTH),
    enable_mood_music: isTruthy(c.env.ENABLE_MOOD_MUSIC),
    enable_google_health: isTruthy(c.env.ENABLE_GOOGLE_HEALTH),
    local_login_requires_access_key: localLoginRequiresAccessKey,
    clerk_enabled: Boolean(c.env.CLERK_JWT_KEY),
    google_client_id: c.env.GOOGLE_CLIENT_ID ?? null,
    google_health_client_id: c.env.GOOGLE_HEALTH_CLIENT_ID ?? null,
  });
});
