export interface FitnessPoint {
  data_type: string;
  date: string;
  value: number;
  metadata: Record<string, unknown> | null;
}

export const ACTIVITY_TO_TAG: Record<string, string> = {
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

export const STEPS_TAGS: Array<[number, string]> = [
  [10000, 'active'],
  [6000, 'healthy'],
  [0, 'sluggish'],
];

export const SLEEP_TAGS: Array<[number, string]> = [
  [420, 'well-rested'],
  [300, 'tired'],
  [0, 'exhausted'],
];

function civilToDate(civil: string | undefined | null): string | null {
  if (civil && civil.length >= 10) return civil.slice(0, 10);
  return null;
}

function floatOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSteps(point: any): FitnessPoint | null {
  const payload = point.steps ?? {};
  const count = payload.count;
  if (count == null) return null;
  const interval = payload.interval ?? {};
  const day = civilToDate(interval.civilStartTime ?? interval.civil_start_time);
  if (!day) return null;
  return { data_type: 'steps', date: day, value: Number(count), metadata: null };
}

export function parseSleep(point: any): FitnessPoint | null {
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

export function parseHeartRate(point: any): FitnessPoint | null {
  const payload = point.heartRate ?? point.heart_rate ?? {};
  const bpm = payload.beatsPerMinute ?? payload.beats_per_minute;
  if (bpm == null) return null;
  const sample = payload.sampleTime ?? payload.sample_time ?? {};
  const ts: string = sample.physicalTime ?? sample.physical_time ?? '';
  const day = ts.length >= 10 ? ts.slice(0, 10) : null;
  if (!day) return null;
  return { data_type: 'heart_rate_avg', date: day, value: Number(bpm), metadata: null };
}

export function parseExercise(point: any): FitnessPoint[] {
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

export function extractDayFromRollup(point: Record<string, unknown>): string | null {
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

export function extractRollupValue(point: Record<string, unknown>, typeName: string): number | null {
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
