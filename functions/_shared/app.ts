import { Hono } from 'hono';
import type { AppEnv } from './lib/env';
import { authMiddleware } from './middleware/auth';
import { corsMiddleware } from './middleware/cors';
import { onError, notFound } from './middleware/error-handler';
import { rateLimit } from './middleware/rate-limit';
import { securityHeaders } from './middleware/security-headers';
import { achievementRoutes } from './routes/achievements';
import { authRoutes } from './routes/auth';
import { configRoutes } from './routes/config';
import { fitnessRoutes } from './routes/fitness';
import { goalRoutes } from './routes/goals';
import { groupRoutes } from './routes/groups';
import { miscRoutes } from './routes/misc';
import { moodRoutes } from './routes/mood';
import { preferencesRoutes } from './routes/preferences';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', securityHeaders);
  app.use('*', corsMiddleware);
  app.use('*', rateLimit);

  app.onError(onError);
  app.notFound(notFound);

  app.route('/api', miscRoutes);
  app.route('/api', configRoutes);
  app.route('/api', authRoutes);

  app.use('/api/*', async (c, next) => {
    const path = c.req.path;
    if (
      path === '/api' ||
      path === '/api/' ||
      path === '/api/time' ||
      path === '/api/config' ||
      path.startsWith('/api/auth/')
    ) {
      return next();
    }
    return authMiddleware(c, next);
  });

  app.route('/api', moodRoutes);
  app.route('/api', goalRoutes);
  app.route('/api', groupRoutes);
  app.route('/api', achievementRoutes);
  app.route('/api', preferencesRoutes);
  app.route('/api', fitnessRoutes);

  return app;
}

export const app = createApp();
