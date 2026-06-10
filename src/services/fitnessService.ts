import { Platform } from 'react-native';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { fitnessConnections, fitnessData } from '../db/schema';
import type { FitnessDataPoint } from '../types';

export const HEALTH_CONNECT_PROVIDER = 'health_connect';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { initialize } = await import('react-native-health-connect');
    return initialize();
  } catch {
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { initialize, requestPermission } = await import('react-native-health-connect');
    const initialized = await initialize();
    if (!initialized) return false;

    const granted = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'ExerciseSession' },
    ]);
    return granted.length > 0;
  } catch {
    return false;
  }
}

export async function getFitnessStatus() {
  const row = await db.query.fitnessConnections.findFirst({
    where: eq(fitnessConnections.provider, HEALTH_CONNECT_PROVIDER),
  });

  return {
    connected: !!row,
    provider: row ? HEALTH_CONNECT_PROVIDER : null,
    last_synced_at: row?.lastSyncedAt ?? null,
  };
}

export async function connectHealthConnect(): Promise<boolean> {
  const granted = await requestHealthPermissions();
  if (!granted) return false;

  await db
    .insert(fitnessConnections)
    .values({ provider: HEALTH_CONNECT_PROVIDER })
    .onConflictDoUpdate({
      target: fitnessConnections.provider,
      set: { updatedAt: sql`CURRENT_TIMESTAMP` },
    });

  return true;
}

export async function disconnectHealthConnect(): Promise<void> {
  await db
    .delete(fitnessConnections)
    .where(eq(fitnessConnections.provider, HEALTH_CONNECT_PROVIDER));
}

export async function syncFitnessData(days = 30): Promise<void> {
  if (Platform.OS !== 'android') return;

  const { initialize, readRecords } = await import('react-native-health-connect');
  const initialized = await initialize();
  if (!initialized) return;

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };

  const upserts: Array<{
    sourceProvider: string;
    dataType: string;
    date: string;
    value: number;
    metadata?: Record<string, unknown> | null;
  }> = [];

  // Steps
  try {
    const stepsResult = await readRecords('Steps', { timeRangeFilter });
    const stepsByDate = new Map<string, number>();
    for (const record of stepsResult.records) {
      const date = formatDate(new Date(record.startTime));
      stepsByDate.set(date, (stepsByDate.get(date) ?? 0) + record.count);
    }
    for (const [date, value] of stepsByDate) {
      upserts.push({ sourceProvider: HEALTH_CONNECT_PROVIDER, dataType: 'steps', date, value });
    }
  } catch {}

  // Sleep
  try {
    const sleepResult = await readRecords('SleepSession', { timeRangeFilter });
    for (const record of sleepResult.records) {
      const date = formatDate(new Date(record.startTime));
      const durationMinutes = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 60000;
      upserts.push({ sourceProvider: HEALTH_CONNECT_PROVIDER, dataType: 'sleep_minutes', date, value: durationMinutes });
    }
  } catch {}

  // Heart rate
  try {
    const hrResult = await readRecords('HeartRate', { timeRangeFilter });
    const hrByDate = new Map<string, number[]>();
    for (const record of hrResult.records) {
      const date = formatDate(new Date(record.time ?? record.startTime));
      const samples = record.samples ?? [];
      for (const sample of samples) {
        const existing = hrByDate.get(date) ?? [];
        existing.push(sample.beatsPerMinute);
        hrByDate.set(date, existing);
      }
    }
    for (const [date, values] of hrByDate) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      upserts.push({ sourceProvider: HEALTH_CONNECT_PROVIDER, dataType: 'heart_rate_avg', date, value: avg });
    }
  } catch {}

  // Calories
  try {
    const calResult = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
    const calByDate = new Map<string, number>();
    for (const record of calResult.records) {
      const date = formatDate(new Date(record.startTime));
      calByDate.set(date, (calByDate.get(date) ?? 0) + record.energy.inKilocalories);
    }
    for (const [date, value] of calByDate) {
      upserts.push({ sourceProvider: HEALTH_CONNECT_PROVIDER, dataType: 'calories', date, value });
    }
  } catch {}

  // Exercise sessions
  try {
    const exerciseResult = await readRecords('ExerciseSession', { timeRangeFilter });
    for (const record of exerciseResult.records) {
      const date = formatDate(new Date(record.startTime));
      const durationMinutes = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 60000;
      upserts.push({
        sourceProvider: HEALTH_CONNECT_PROVIDER,
        dataType: 'active_minutes',
        date,
        value: durationMinutes,
      });
    }
  } catch {}

  // Batch upsert all records
  for (const item of upserts) {
    await db
      .insert(fitnessData)
      .values(item)
      .onConflictDoUpdate({
        target: [fitnessData.sourceProvider, fitnessData.dataType, fitnessData.date],
        set: { value: item.value, metadata: item.metadata ?? null },
      });
  }

  await db
    .update(fitnessConnections)
    .set({ lastSyncedAt: new Date().toISOString(), updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(fitnessConnections.provider, HEALTH_CONNECT_PROVIDER));
}

export async function getFitnessDataForDate(date: string): Promise<FitnessDataPoint[]> {
  const rows = await db
    .select()
    .from(fitnessData)
    .where(eq(fitnessData.date, date));

  return rows.map((row) => ({
    id: row.id,
    data_type: row.dataType,
    date: row.date,
    value: row.value,
    metadata: row.metadata,
    source_provider: row.sourceProvider,
    created_at: row.createdAt,
  }));
}
