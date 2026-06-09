import {
  type FitnessPoint,
  extractDayFromRollup,
  extractRollupValue,
  parseExercise,
  parseHeartRate,
  parseSleep,
  parseSteps,
} from './parser';

const GOOGLE_HEALTH_BASE = 'https://health.googleapis.com/v4';

function dateToCivil(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00`;
}

function dateToRfc(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00Z`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export async function listDataType(
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
    if (!resp.ok) throw new Error(`Failed to fetch ${typeName}: ${resp.status}`);
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

export async function dailyRollup(
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
    if (!resp.ok) throw new Error(`dailyRollUp failed for ${typeName}: ${resp.status}`);
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

export async function fetchGoogleHealthData(accessToken: string, start: Date, end: Date): Promise<FitnessPoint[]> {
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
