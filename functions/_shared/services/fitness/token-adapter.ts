import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { fitnessConnections } from '../../db/schema';
import { decryptToken, encryptToken } from '../../lib/crypto';
import type { Bindings } from '../../lib/env';

export function tokenSecret(env: Pick<Bindings, 'FITNESS_TOKEN_KEY' | 'JWT_SECRET'>): string {
  const secret = env.FITNESS_TOKEN_KEY || env.JWT_SECRET;
  if (!secret) {
    throw new Error('Fitness token encryption key is not configured');
  }
  return secret;
}

export async function maybeRefreshToken(
  db: Database,
  env: Pick<Bindings, 'FITNESS_TOKEN_KEY' | 'JWT_SECRET' | 'GOOGLE_HEALTH_CLIENT_ID'>,
  row: typeof fitnessConnections.$inferSelect
): Promise<string> {
  const secret = tokenSecret(env);
  const accessToken = await decryptToken(row.accessToken, secret);

  if (row.expiresAt) {
    try {
      const expiry = new Date(row.expiresAt);
      if (expiry.getTime() - Date.now() > 5 * 60_000) {
        return accessToken;
      }
    } catch {
      // fall through to refresh attempt
    }
  }

  if (!row.refreshToken) {
    console.warn('No refresh token available; using potentially-expired access token');
    return accessToken;
  }

  try {
    const refreshToken = await decryptToken(row.refreshToken, secret);
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.GOOGLE_HEALTH_CLIENT_ID ?? '',
      }),
    });
    if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
    const tokenData = (await resp.json()) as { access_token: string; expires_in?: number };
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();
    const newAccessEnc = await encryptToken(tokenData.access_token, secret);

    await db
      .update(fitnessConnections)
      .set({ accessToken: newAccessEnc, expiresAt: newExpiresAt, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(fitnessConnections.userId, row.userId), eq(fitnessConnections.provider, row.provider)));

    return tokenData.access_token;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return accessToken;
  }
}
