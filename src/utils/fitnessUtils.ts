import type { FitnessDataPoint } from '../types';

export const FITNESS_LABEL: Record<string, string> = {
  steps: 'Steps',
  sleep_minutes: 'Sleep',
  heart_rate_avg: 'HR',
  calories: 'Calories',
  active_minutes: 'Active',
  workout: 'Workout',
};

export const WORKOUT_ACTIVITY_LABEL: Record<string, string> = {
  running: 'Run',
  walking: 'Walk',
  cycling: 'Cycle',
  yoga: 'Yoga',
  workout: 'Workout',
  stretching: 'Stretch',
  swimming: 'Swim',
};

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatPace(sPerKm: number): string {
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatFitnessValue(d: FitnessDataPoint): string {
  switch (d.data_type) {
    case 'steps':
      return Math.round(d.value).toLocaleString();
    case 'sleep_minutes':
      return formatDuration(d.value * 60);
    case 'heart_rate_avg':
      return `${Math.round(d.value)} bpm`;
    case 'calories':
      return `${Math.round(d.value)} kcal`;
    case 'active_minutes':
      return `${Math.round(d.value)} min`;
    case 'workout':
      return formatWorkoutSummary(d);
    default:
      return String(Math.round(d.value));
  }
}

export function formatWorkoutSummary(d: FitnessDataPoint): string {
  const m = d.metadata as Record<string, number & { activity_type?: string }> | null;
  if (!m) return 'Workout';
  const activityType = (m as Record<string, unknown>).activity_type as string | undefined;
  const label = activityType ? (WORKOUT_ACTIVITY_LABEL[activityType.toLowerCase()] ?? 'Workout') : 'Workout';
  const parts: string[] = [label];
  if (typeof m.distance_meters === 'number') parts.push(formatDistance(m.distance_meters));
  if (typeof m.duration_seconds === 'number') parts.push(formatDuration(m.duration_seconds));
  if (typeof m.avg_pace_s_per_km === 'number') parts.push(formatPace(m.avg_pace_s_per_km));
  if (typeof m.calories === 'number') parts.push(`${Math.round(m.calories)} kcal`);
  return parts.join(' · ');
}
