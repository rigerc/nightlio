import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Miniflare } from 'miniflare';
import { createApp } from './app';
import type { Bindings } from './lib/env';

const baseEnv = {
  JWT_SECRET: 'test-secret',
  JWT_EXPIRES_IN_SECONDS: '3600',
  DEFAULT_SELF_HOST_ID: 'selfhost_test_user',
  CORS_ORIGINS: 'http://localhost:5173',
  ENABLE_GOOGLE_OAUTH: '0',
  ENABLE_MOOD_MUSIC: '0',
  ENABLE_GOOGLE_HEALTH: '1',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_HEALTH_CLIENT_ID: 'health-client-id',
} satisfies Partial<Bindings>;

async function applyD1Migrations(db: D1Database): Promise<void> {
  const migrationDir = path.join(process.cwd(), 'drizzle');
  const files = readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = readFileSync(path.join(migrationDir, file), 'utf8');
    const statements = sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim().replace(/;$/, ''))
      .filter(Boolean);

    for (const statement of statements) {
      await db.prepare(statement).run();
    }
  }
}

describe('Hono app routes', () => {
  let mf: Miniflare;
  let env: Bindings;

  beforeEach(async () => {
    mf = new Miniflare({
      modules: true,
      script: 'export default { fetch() { return new Response("ok") } }',
      d1Databases: ['DB'],
    });
    const db = await mf.getD1Database('DB');
    await applyD1Migrations(db);
    env = { ...baseEnv, DB: db } as Bindings;
  });

  afterEach(async () => {
    await mf.dispose();
  });

  async function localLogin(): Promise<string> {
    const app = createApp();
    const response = await app.request('http://localhost/api/auth/local/login', { method: 'POST' }, env);
    expect(response.status).toBe(200);
    const body = await response.json() as { token: string };
    return body.token;
  }

  it('returns the API health payload', async () => {
    const app = createApp();
    const response = await app.request('/api', undefined, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'healthy',
      message: 'Waymark API is running',
    });
  });

  it('returns the public config shape from Worker env bindings', async () => {
    const app = createApp();
    const response = await app.request('http://localhost/api/config', undefined, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      enable_google_oauth: false,
      enable_mood_music: false,
      enable_google_health: true,
      local_login_requires_access_key: false,
      clerk_enabled: false,
      google_client_id: 'google-client-id',
      google_health_client_id: 'health-client-id',
    });
  });

  it('protects API routes outside the public allowlist', async () => {
    const app = createApp();
    const response = await app.request('/api/moods', undefined, env);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authorization header required' });
  });

  it('creates a local session and persists mood entries with selections and slider values', async () => {
    const app = createApp();
    const token = await localLogin();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const groupResponse = await app.request('/api/groups', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Energy', type: 'slider', slider_min: 1, slider_max: 5 }),
    }, env);
    expect(groupResponse.status).toBe(201);
    const { group_id: groupId } = await groupResponse.json() as { group_id: number };

    const optionResponse = await app.request(`/api/groups/${groupId}/options`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Focused' }),
    }, env);
    expect(optionResponse.status).toBe(201);
    const { option_id: optionId } = await optionResponse.json() as { option_id: number };

    const createResponse = await app.request('/api/mood', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mood: 4,
        date: '2026-06-08',
        content: 'Initial reflection',
        selected_options: [optionId],
        slider_values: { [groupId]: 5 },
      }),
    }, env);
    expect(createResponse.status).toBe(201);
    const { entry_id: entryId } = await createResponse.json() as { entry_id: number };

    const updateResponse = await app.request(`/api/mood/${entryId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        mood: 5,
        content: 'Updated reflection',
        selected_options: [],
        slider_values: { [groupId]: 3 },
      }),
    }, env);
    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json() as {
      entry: { mood: number; content: string; selections: unknown[]; slider_values: Array<{ group_id: number; value: number }> };
    };
    expect(updateBody.entry).toMatchObject({ mood: 5, content: 'Updated reflection', selections: [] });
    expect(updateBody.entry.slider_values).toEqual([expect.objectContaining({ group_id: groupId, value: 3 })]);

    const historyResponse = await app.request('/api/moods', { headers }, env);
    expect(historyResponse.status).toBe(200);
    const entries = await historyResponse.json() as Array<{ id: number; mood: number; content: string }>;
    expect(entries).toEqual([expect.objectContaining({ id: entryId, mood: 5, content: 'Updated reflection' })]);
  });

  it('creates and updates a weekly goal through the Hono API', async () => {
    const app = createApp();
    const token = await localLogin();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const createResponse = await app.request('/api/goals', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Walk outside', frequency_per_week: 3 }),
    }, env);
    expect(createResponse.status).toBe(201);
    const { id: goalId } = await createResponse.json() as { id: number };

    const progressResponse = await app.request(`/api/goals/${goalId}/progress`, { method: 'POST', headers }, env);
    expect(progressResponse.status).toBe(200);
    await expect(progressResponse.json()).resolves.toMatchObject({
      id: goalId,
      title: 'Walk outside',
      completed: 1,
      frequency_per_week: 3,
    });
  });
});
