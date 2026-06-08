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
import { decryptToken, encryptToken } from '../lib/crypto';
import type { Bindings } from '../lib/env';

export class FitnessError extends Error {}

const GOOGLE_HEALTH_BASE = 'https://health.googleapis.com/v4';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const ACTIVITY_TO_TAG: Record<string, string> = {
  running: 'ran',
  run: 'ran',
  'trail running': 'ran',
  trail_running: 'ran',
  walking: 'walked',
  walk: 'walked',
  hiking: 'walked',
  cycling: 'cycled',
  biking: 'cycled',
  bike: 'cycled',
  'mountain biking': 'cycled',
  mountain_biking: 'cycled',
  'indoor cycling': 'cycled',
  indoor_cycling: 'cycled',
  workout: 'worked out',
  'strength training': 'worked out',
  strength_training: 'worked out',
  weightlifting: 'worked out',
  'weight training': 'worked out',
  swimming: 'worked out',
  rowing: 'worked out',
  aerobics: 'worked out',
  'high intensity interval training': 'worked out',
  hiit: 'worked out',
  yoga: 'yoga',
  stretching: 'stretched',
  stretch: 'stretched',
  '7': 'ran',
  '8': 'walked',
  '1': 'cycled',
  '9': 'worked out',
  '82': 'worked out',
  '83': 'yoga',
};

const STEPS_TAGS: Array<[number, string]> = [
  [10000, 'active'],
  [6000, 'healthy'],
  [0, 'sluggish'],
];

const SLEEP_TAGS: Array<[number, string]> = [
  [420, 'well-rested'],
  [300, 'tired'],
  [0, 'exhausted'],
];

interface FitnessPoint {
  data_type: string;
  date: string;
  value: number;
  metadata: Record<string, unknown> | null;
}

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

function tokenSecret(env: Pick<Bindings, 'FITNESS_TOKEN_KEY' | 'JWT_SECRET'>): string {
  return env.FITNESS_TOKEN_KEY || env.JWT_SECRET;
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

function civilToDate(civil: string | undefined | null): string | null {
  if (civil && civil.length >= 10) return civil.slice(0, 10);
  return null;
}

function floatOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSteps(point: any): FitnessPoint | null {
  const payload = point.steps ?? {};
  const count = payload.count;
  if (count == null) return null;
  const interval = payload.interval ?? {};
  const day = civilToDate(interval.civilStartTime ?? interval.civil_start_time);
  if (!day) return null;
  return { data_type: 'steps', date: day, value: Number(count), metadata: null };
}

function parseSleep(point: any): FitnessPoint | null {
  const payload = point.sleep ?? {};
  const interval = payload.interval ?? {};
  const startStr = interval.startTime ?? interval.start_time;
  const endStr = interval.endTime ?? interval.end_time;
  if (!startStr || !endStr) return null;
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const minutes = (end.getTime() - start.getTime()) / 60000;
    const day = end.toISOString().slice(0, 10);
    return { data_type: 'sleep_minutes', date: day, value: Math.round(minutes * 10) / 10, metadata: null };
  } catch {
    return null;
  }
}

function parseHeartRate(point: any): FitnessPoint | null {
  const payload = point.heartRate ?? point.heart_rate ?? {};
  const bpm = payload.beatsPerMinute ?? payload.beats_per_minute;
  if (bpm == null) return null;
  const sample = payload.sampleTime ?? payload.sample_time ?? {};
  const ts: string = sample.physicalTime ?? sample.physical_time ?? '';
  const day = ts.length >= 10 ? ts.slice(0, 10) : null;
  if (!day) return null;
  return { data_type: 'heart_rate_avg', date: day, value: Number(bpm), metadata: null };
}

function parseExercise(point: any): FitnessPoint[] {
  const payload = point.exercise ?? {};
  const activity = String(payload.activityName ?? payload.activity_name ?? '').toLowerCase().trim();
  const interval = payload.interval ?? {};
  const startStr: string = interval.civilStartTime ?? interval.civil_start_time ?? '';
  const endStr: string = interval.civilEndTime ?? interval.civil_end_time ?? startStr;
  const day = civilToDate(startStr);
  if (!day) return [];

  let durationSec = 0;
  try {
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : start;
    durationSec = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  } catch {
    durationSec = 0;
  }

  const meta: Record<string, unknown> = { activity_type: activity, duration_seconds: durationSec };
  const distanceM = floatOrNull(payload.distance);
  const calories = floatOrNull(payload.calories);

  if (distanceM && distanceM > 0) {
    meta.distance_meters = Math.round(distanceM * 10) / 10;
    if (durationSec > 0) {
      meta.avg_pace_s_per_km = Math.round(durationSec / (distanceM / 1000));
      meta.avg_speed_m_s = Math.round((distanceM / durationSec) * 100) / 100;
    }
  }
  if (calories && calories > 0) {
    meta.calories = Math.round(calories);
  }

  return [{ data_type: 'workout', date: day, value: 1, metadata: meta }];
}

function extractDayFromRollup(point: Record<string, unknown>): string | null {
  for (const field of Object.values(point)) {
    if (field && typeof field === 'object') {
      const obj = field as Record<string, any>;
      const interval = obj.interval ?? {};
      const start = interval.civilStartTime ?? interval.civil_start_time;
      if (start && String(start).length >= 10) return String(start).slice(0, 10);
      const d = obj.date ?? obj.civilDate;
      if (d && typeof d === 'object') {
        const { year, month, day } = d as { year?: number; month?: number; day?: number };
        if (year && month && day) {
          return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
  }
  return null;
}

function extractRollupValue(point: Record<string, unknown>, typeName: string): number | null {
  const snake = typeName.replace(/-/g, '_');
  const payload = (point[snake] ?? point[typeName]) as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== 'object') return null;
  for (const key of ['energy', 'value', 'count', 'minutes', 'beatsPerMinute', 'beats_per_minute']) {
    const value = payload[key];
    if (value != null) {
      const parsed = floatOrNull(value);
      if (parsed != null) return parsed;
    }
  }
  for (const value of Object.values(payload)) {
    if (typeof value === 'number') return value;
  }
  return null;
}

function dateToCivil(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00`;
}

function dateToRfc(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00Z`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

async function listDataType(
  typeName: string,
  accessToken: string,
  filterExpr: string,
  parser: (point: any) => FitnessPoint | FitnessPoint[] | null
): Promise<FitnessPoint[]> {
  const url = new URL(`${GOOGLE_HEALTH_BASE}/users/me/dataTypes/${typeName}/dataPoints`);
  url.searchParams.set('filter', filterExpr);
  url.searchParams.set('pageSize', '1000');

  let data: any;
  try {
    const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (resp.status === 404) return [];
    if (!resp.ok) throw new FitnessError(`Failed to fetch ${typeName}: ${resp.status}`);
    data = await resp.json();
  } catch (err) {
    console.warn(`Failed to fetch ${typeName}:`, err);
    return [];
  }

  const result: FitnessPoint[] = [];
  for (const point of data?.dataPoints ?? []) {
    try {
      const parsed = parser(point);
      if (parsed) {
        if (Array.isArray(parsed)) result.push(...parsed);
        else result.push(parsed);
      }
    } catch (err) {
      console.debug(`Failed to parse ${typeName} data point:`, err);
    }
  }
  return result;
}

async function dailyRollup(
  typeName: string,
  accessToken: string,
  start: Date,
  end: Date,
  outputType: string
): Promise<FitnessPoint[]> {
  const url = `${GOOGLE_HEALTH_BASE}/users/me/dataTypes/${typeName}/dataPoints:dailyRollUp`;
  const body = {
    range: {
      start: { date: { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, day: start.getUTCDate() } },
      end: { date: { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1, day: end.getUTCDate() } },
    },
    windowSizeDays: 1,
  };

  let data: any;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.status === 404 || resp.status === 405) return [];
    if (!resp.ok) throw new FitnessError(`dailyRollUp failed for ${typeName}: ${resp.status}`);
    data = await resp.json();
  } catch (err) {
    console.warn(`dailyRollUp failed for ${typeName}:`, err);
    return [];
  }

  const result: FitnessPoint[] = [];
  for (const point of data?.rollupDataPoints ?? []) {
    try {
      const day = extractDayFromRollup(point);
      const value = extractRollupValue(point, typeName);
      if (day && value != null) {
        result.push({ data_type: outputType, date: day, value: Math.round(value * 100) / 100, metadata: null });
      }
    } catch (err) {
      console.debug(`Failed to parse rollup point for ${typeName}:`, err);
    }
  }
  return result;
}

async function fetchGoogleHealthData(accessToken: string, start: Date, end: Date): Promise<FitnessPoint[]> {
  const civilStart = dateToCivil(start);
  const civilEnd = dateToCivil(addDays(end, 1));
  const rfcStart = dateToRfc(start);
  const rfcEnd = dateToRfc(addDays(end, 1));

  const result: FitnessPoint[] = [];

  result.push(
    ...(await listDataType(
      'steps',
      accessToken,
      `steps.interval.civil_start_time >= "${civilStart}" AND steps.interval.civil_start_time < "${civilEnd}"`,
      parseSteps
    ))
  );
  result.push(
    ...(await listDataType(
      'sleep',
      accessToken,
      `sleep.interval.end_time >= "${rfcStart}" AND sleep.interval.end_time < "${rfcEnd}"`,
      parseSleep
    ))
  );
  result.push(
    ...(await listDataType(
      'heart-rate',
      accessToken,
      `heart_rate.sample_time.physical_time >= "${rfcStart}" AND heart_rate.sample_time.physical_time < "${rfcEnd}"`,
      parseHeartRate
    ))
  );
  result.push(
    ...(await listDataType(
      'exercise',
      accessToken,
      `exercise.interval.civil_start_time >= "${civilStart}" AND exercise.interval.civil_start_time < "${civilEnd}"`,
      parseExercise
    ))
  );
  result.push(...(await dailyRollup('total-calories', accessToken, start, end, 'calories')));
  result.push(...(await dailyRollup('active-minutes', accessToken, start, end, 'active_minutes')));

  return result;
}

async function maybeRefreshToken(
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
    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.GOOGLE_HEALTH_CLIENT_ID ?? '',
      }),
    });
    if (!resp.ok) throw new FitnessError(`Token refresh failed: ${resp.status}`);
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

  // Skip (returning 0, same as the original FastAPI throttle in
  // api/services/fitness_service.py::sync) if synced within the last hour —
  // intentional, to avoid hammering the Google Health API on every page load,
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
