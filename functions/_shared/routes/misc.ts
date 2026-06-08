import { Hono } from 'hono';
import type { AppEnv } from '../lib/env';

export const miscRoutes = new Hono<AppEnv>();

miscRoutes.get('/', (c) =>
  c.json({
    status: 'healthy',
    message: 'Waymark API is running',
    timestamp: Date.now() / 1000,
  })
);

miscRoutes.get('/time', (c) => c.json({ time: Date.now() / 1000 }));
