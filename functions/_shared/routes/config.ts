import { Hono } from 'hono';
import type { AppEnv } from '../lib/env';
import { isTruthy } from '../lib/env';

export const configRoutes = new Hono<AppEnv>();

configRoutes.get('/config', (c) => {
  return c.json({
    enable_google_oauth: isTruthy(c.env.ENABLE_GOOGLE_OAUTH),
    enable_mood_music: isTruthy(c.env.ENABLE_MOOD_MUSIC),
    enable_google_health: isTruthy(c.env.ENABLE_GOOGLE_HEALTH),
    google_client_id: c.env.GOOGLE_CLIENT_ID ?? null,
    google_health_client_id: c.env.GOOGLE_HEALTH_CLIENT_ID ?? null,
  });
});
