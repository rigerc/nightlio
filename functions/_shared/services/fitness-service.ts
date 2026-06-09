import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import {
  entrySelections,
  fitnessConnections,
  fitnessData,
  groupOptions,
  groups,
  moodEntries,
} from '../db/schema';
import { encryptToken } from '../lib/crypto';
import type { Bindings } from '../lib/env';
import { addDays, fetchGoogleHealthData } from './fitness/google-fetch-adapter';
import type { FitnessPoint } from './fitness/parser';
import { ACTIVITY_TO_TAG, SLEEP_TAGS, STEPS_TAGS } from './fitness/parser';
import { maybeRefreshToken, tokenSecret } from './fitness/token-adapter';

export class FitnessError extends Error {}

export interface FitnessConnectionStatus {
  connected: boolean;
  provider: string | null;
  last_synced_at: string | null;
}

export interface FitnessDataPoint {
  id: number;
  data_type: string;
  date: string;
  value: number;
  metadata: Record<string, unknown> | null;
  source_provider: string;
  created_at: string;
}

function toDataPoint(row: typeof fitnessData.$inferSelect): FitnessDataPoint {
  return {
    id: row.id,
    data_type: row.dataType,
    date: row.date,
    value: row.value,
    metadata: row.metadata,
    source_provider: row.sourceProvider,
    created_at: row.createdAt,
  };
}

export async function storeTokens(
  db: Database,
  env: Pick<Bindings, 'FITNESS_TOKEN_KEY' | 'JWT_SECRET'>,
  userId: number,
  provider: string,
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresIn: number | null | undefined
): Promise<void> {
  const secret = tokenSecret(env);
  const accessEnc = await encryptToken(accessToken, secret);
  const refreshEnc = refreshToken ? await encryptToken(refreshToken, secret) : null;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  await db
    .insert(fitnessConnections)
    .values({
      userId,
      provider,
      accessToken: accessEnc,
      refreshToken: refreshEnc,
      expiresAt,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .onConflictDoUpdate({
      target: [fitnessConnections.userId, fitnessConnections.provider],
      set: {
        accessToken: accessEnc,
        refreshToken: refreshEnc,
        expiresAt,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function getConnectionStatus(db: Database, userId: number, provider: string): Promise<FitnessConnectionStatus> {
  const row = await db.query.fitnessConnections.findFirst({
    where: and(eq(fitnessConnections.userId, userId), eq(fitnessConnections.provider, provider)),
  });
  if (!row) {
    return { connected: false, provider: null, last_synced_at: null };
  }
  return { connected: true, provider: row.provider, last_synced_at: row.lastSyncedAt };
}

export async function disconnect(db: Database, userId: number, provider: string): Promise<void> {
  await db
    .delete(fitnessConnections)
    .where(and(eq(fitnessConnections.userId, userId), eq(fitnessConnections.provider, provider)));
  await db
    .delete(fitnessData)
    .where(and(eq(fitnessData.userId, userId), eq(fitnessData.sourceProvider, provider)));
}

export async function getData(
  db: Database,
  userId: number,
  provider: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<FitnessDataPoint[]> {
  const conditions = [eq(fitnessData.userId, userId), eq(fitnessData.sourceProvider, provider)];
  if (startDate) conditions.push(gte(fitnessData.date, startDate));
  if (endDate) conditions.push(lte(fitnessData.date, endDate));

  const rows = await db
    .select()
    .from(fitnessData)
    .where(and(...conditions))
    .orderBy(desc(fitnessData.date), asc(fitnessData.id));

  return rows.map(toDataPoint);
}

export async function getDataForDates(db: Database, userId: number, dates: string[]): Promise<Record<string, FitnessDataPoint[]>> {
  if (dates.length === 0) return {};

  const rows = await db
    .select()
    .from(fitnessData)
    .where(and(eq(fitnessData.userId, userId), inArray(fitnessData.date, dates)))
    .orderBy(desc(fitnessData.date), asc(fitnessData.id));

  const byDate: Record<string, FitnessDataPoint[]> = {};
  for (const row of rows) {
    const point = toDataPoint(row);
    (byDate[point.date] ??= []).push(point);
  }
  return byDate;
}

async function applyFitnessToEntries(db: Database, userId: number, points: FitnessPoint[]): Promise<void> {
  const byDate = new Map<string, FitnessPoint[]>();
  for (const point of points) {
    const list = byDate.get(point.date);
    if (list) list.push(point);
    else byDate.set(point.date, [point]);
  }

  for (const [day, dayPoints] of byDate) {
    const entry = await db.query.moodEntries.findFirst({
      where: and(eq(moodEntries.userId, userId), eq(moodEntries.date, day)),
      columns: { id: true },
    });
    if (!entry) continue;

    const tagsToAdd = new Set<string>();
    for (const point of dayPoints) {
      if (point.data_type === 'steps') {
        for (const [threshold, tag] of STEPS_TAGS) {
          if (point.value >= threshold) {
            tagsToAdd.add(tag);
            break;
          }
        }
      } else if (point.data_type === 'sleep_minutes') {
        for (const [threshold, tag] of SLEEP_TAGS) {
          if (point.value >= threshold) {
            tagsToAdd.add(tag);
            break;
          }
        }
      } else if (point.data_type === 'workout') {
        const activity = String(point.metadata?.activity_type ?? '').toLowerCase().trim();
        const tag = ACTIVITY_TO_TAG[activity];
        if (tag) tagsToAdd.add(tag);
      }
    }

    for (const tagName of tagsToAdd) {
      // Tag names aren't scoped to a group, so if two groups ever share an
      // option name, order by id to keep the match deterministic rather than
      // arbitrary (whatever D1 happens to return first).
      const [option] = await db
        .select({ id: groupOptions.id })
        .from(groupOptions)
        .innerJoin(groups, eq(groupOptions.groupId, groups.id))
        .where(and(eq(groups.userId, userId), sql`LOWER(${groupOptions.name}) = LOWER(${tagName})`))
        .orderBy(asc(groupOptions.id));
      if (!option) continue;

      const existing = await db.query.entrySelections.findFirst({
        where: and(eq(entrySelections.entryId, entry.id), eq(entrySelections.optionId, option.id)),
        columns: { id: true },
      });
      if (!existing) {
        await db.insert(entrySelections).values({ entryId: entry.id, optionId: option.id, source: 'google_health' });
      }
    }
  }
}

export async function sync(
  db: Database,
  env: Pick<Bindings, 'FITNESS_TOKEN_KEY' | 'JWT_SECRET' | 'GOOGLE_HEALTH_CLIENT_ID'>,
  userId: number,
  provider: string,
  days: number
): Promise<number> {
  const row = await db.query.fitnessConnections.findFirst({
    where: and(eq(fitnessConnections.userId, userId), eq(fitnessConnections.provider, provider)),
  });
  if (!row) {
    throw new FitnessError(`No fitness connection for user ${userId} provider ${provider}`);
  }

  // Skip (returning 0) if synced within the last hour — intentional, to avoid
  // hammering the Google Health API on every page load,
  // even for an explicit user-triggered sync.
  if (row.lastSyncedAt) {
    try {
      const last = new Date(row.lastSyncedAt);
      if (Date.now() - last.getTime() < 3_600_000) {
        return 0;
      }
    } catch {
      // ignore parse failures, proceed with sync
    }
  }

  const accessToken = await maybeRefreshToken(db, env, row);
  const end = new Date();
  const start = addDays(end, -(days - 1));

  const points = await fetchGoogleHealthData(accessToken, start, end);

  for (const point of points) {
    const metadataJson = point.metadata;
    await db
      .insert(fitnessData)
      .values({
        userId,
        sourceProvider: provider,
        dataType: point.data_type,
        date: point.date,
        value: point.value,
        metadata: metadataJson,
      })
      .onConflictDoUpdate({
        target: [fitnessData.userId, fitnessData.sourceProvider, fitnessData.dataType, fitnessData.date],
        set: { value: point.value, metadata: metadataJson },
      });
  }

  await applyFitnessToEntries(db, userId, points);

  await db
    .update(fitnessConnections)
    .set({ lastSyncedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(fitnessConnections.userId, userId), eq(fitnessConnections.provider, provider)));

  return points.length;
}
