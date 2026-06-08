import { handle } from 'hono/cloudflare-pages';
import { app } from '../_shared/app';

export const onRequest = handle(app);
