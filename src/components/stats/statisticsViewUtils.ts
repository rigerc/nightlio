import { Frown, Meh, Smile, Heart } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { getMoodIcon } from '../../utils/moodUtils';
import type { Entry, MoodValue } from '../../types';

type IconComponent = ComponentType<LucideProps>;

export interface MoodLegendEntry {
  value: number;
  icon: IconComponent;
  color: string;
  label: string;
  shorthand: string;
}

export interface CalendarDay {
  key: string;
  label: number;
  entry: Entry | undefined;
  IconComponent: IconComponent | null;
  iconColor: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface OverviewCard {
  key: string;
  value: number | string;
  label: string;
  helperText?: string;
}

// Minimum days of recent data before we'll venture a "compared to your usual" framing —
// a couple of entries shouldn't be presented as a meaningful trend (see guideline #13).
export const MIN_DAYS_FOR_BASELINE_COMPARISON = 7;
const BASELINE_COMPARISON_MARGIN = 0.3;

export const buildMoodBaselineComparison = (
  recentAverage: number | null,
  recentSampleSize: number,
  baselineAverage: number | null | undefined,
): string | null => {
  if (
    recentAverage == null ||
    typeof baselineAverage !== 'number' ||
    recentSampleSize < MIN_DAYS_FOR_BASELINE_COMPARISON
  ) {
    return null;
  }

  const delta = recentAverage - baselineAverage;
  if (Math.abs(delta) < BASELINE_COMPARISON_MARGIN) return 'about the same as your usual lately';
  return delta > 0 ? 'a bit above your usual lately' : 'a bit below your usual lately';
};

export type TagConfidence = 'low' | 'medium' | 'high';

export interface TagStat {
  tag: string;
  count: number;
  avgMood: number;
  confidence: TagConfidence;
}

export interface TagStats {
  topPositive: TagStat[];
  topNegative: TagStat[];
  all: TagStat[];
}

export interface MoodDistributionDatum {
  key: number;
  label: string;
  mood: string;
  count: number;
  fill: string;
}

export const RANGE_OPTIONS: readonly number[] = Object.freeze([7, 30, 90]);

export const TOOLTIP_STYLE = Object.freeze({
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-md)',
});

export const DEFAULT_METRICS = Object.freeze({ total_entries: 0, average_mood: 0 });
export const EMPTY_OBJECT: Record<string, number> = Object.freeze({});

// Early signal vs. an established pattern worth acting on — both are shown, but
// labeled with their confidence so users don't mistake a handful of logs for a trend.
export const MIN_TAG_OCCURRENCES = 5;
export const RELIABLE_TAG_OCCURRENCES = 14;

export const tagConfidenceFor = (count: number): TagConfidence =>
  count >= RELIABLE_TAG_OCCURRENCES ? 'high' : count >= MIN_TAG_OCCURRENCES ? 'medium' : 'low';

export const MOOD_LEGEND: readonly MoodLegendEntry[] = Object.freeze([
  { value: 1, icon: Frown, color: 'var(--mood-1)', label: 'Terrible', shorthand: 'T' },
  { value: 2, icon: Frown, color: 'var(--mood-2)', label: 'Bad', shorthand: 'B' },
  { value: 3, icon: Meh, color: 'var(--mood-3)', label: 'Okay', shorthand: 'O' },
  { value: 4, icon: Smile, color: 'var(--mood-4)', label: 'Good', shorthand: 'G' },
  { value: 5, icon: Heart, color: 'var(--mood-5)', label: 'Amazing', shorthand: 'A' },
]);

export const MOOD_FULL_LABELS: Record<number, string> = MOOD_LEGEND.reduce<Record<number, string>>(
  (acc, { value, label }) => { acc[value] = label; return acc; },
  {},
);

export const MOOD_SHORTHANDS: Record<number, string> = MOOD_LEGEND.reduce<Record<number, string>>(
  (acc, { value, shorthand }) => { acc[value] = shorthand; return acc; },
  {},
);

export const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const formatTrendTooltip = (
  value: number | null | undefined,
  _name: string,
  props?: { dataKey?: string },
): [string, string] => {
  if (props?.dataKey === 'ma') {
    if (value == null || Number.isNaN(value)) return ['No data', 'Moving Avg'];
    return [Number(value).toFixed(2), 'Moving Avg'];
  }
  if (value == null) return ['No entry', 'Mood'];
  return [MOOD_FULL_LABELS[value] ?? '', 'Mood'];
};

export const normalizeDateKey = (date: string | Date | null | undefined): string | null => {
  if (!date) return null;
  const instance = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instance.getTime())) return null;
  return instance.toLocaleDateString();
};

export const buildMoodDistributionData = (
  moodDistribution: Record<string, number> | undefined,
): MoodDistributionDatum[] =>
  MOOD_LEGEND.map(({ value, label, shorthand, color }) => ({
    key: value,
    label,
    mood: shorthand,
    count: moodDistribution?.[value] ?? 0,
    fill: color,
  }));

export const aggregateTagStats = (
  entries: Entry[] | null | undefined,
  minOccurrences = MIN_TAG_OCCURRENCES,
): TagStats => {
  if (!entries?.length) return { topPositive: [], topNegative: [], all: [] };

  const aggregateMap = new Map<string, { tag: string; count: number; sum: number }>();

  for (const entry of entries) {
    const mood = Number(entry.mood);
    if (!entry.selections?.length) continue;

    for (const selection of entry.selections) {
      const key = selection.name || String(selection.id);
      const aggregate = aggregateMap.get(key) ?? { tag: key, count: 0, sum: 0 };
      aggregate.count += 1;
      aggregate.sum += mood;
      aggregateMap.set(key, aggregate);
    }
  }

  const rows: TagStat[] = Array.from(aggregateMap.values()).map(({ tag, count, sum }) => ({
    tag,
    count,
    avgMood: count ? sum / count : 0,
    confidence: tagConfidenceFor(count),
  }));

  const ranked = rows.filter((row) => row.count >= minOccurrences).sort((a, b) => b.avgMood - a.avgMood);

  return {
    topPositive: ranked.slice(0, 5),
    topNegative: ranked.slice(-5).reverse(),
    all: rows,
  };
};

export const buildCalendarDays = (entries: Entry[] | null | undefined): CalendarDay[] => {
  const today = new Date();
  const todayKey = today.toDateString();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const lookup = new Map<string, Entry>();
  for (const entry of entries ?? []) {
    const key = normalizeDateKey(entry.date);
    if (key) lookup.set(key, entry);
  }

  const days: CalendarDay[] = [];
  const current = new Date(startDate);
  while (current <= lastDay || current.getDay() !== 0) {
    const dateKey = normalizeDateKey(current);
    const entry = dateKey ? lookup.get(dateKey) : undefined;
    const moodInfo = entry ? getMoodIcon(entry.mood) : null;

    days.push({
      key: current.toISOString(),
      label: current.getDate(),
      entry,
      IconComponent: moodInfo?.icon ?? null,
      iconColor: moodInfo?.color ?? null,
      isCurrentMonth: current.getMonth() === today.getMonth(),
      isToday: current.toDateString() === todayKey,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
};

export const buildOverviewCards = ({
  totalEntries,
  averageMood,
  currentStreak,
  bestDayCount,
  recentMoodComparison,
}: {
  totalEntries: number;
  averageMood: number | undefined;
  currentStreak: number;
  bestDayCount: number;
  recentMoodComparison?: string | null;
}): OverviewCard[] => [
  { key: 'totalEntries', value: totalEntries, label: 'Total Entries' },
  {
    key: 'averageMood',
    value: typeof averageMood === 'number' ? averageMood.toFixed(1) : averageMood ?? '0.0',
    label: 'Average Mood',
    helperText: recentMoodComparison ?? undefined,
  },
  { key: 'currentStreak', value: currentStreak, label: 'Logging Streak' },
  { key: 'bestDay', value: bestDayCount, label: 'Best Day' },
];

const WEEK_LENGTH_DAYS = 7;
const MIN_DAYS_FOR_WEEKLY_COMPARISON = 3;
const WEEKLY_COMPARISON_MARGIN = 0.3;

export interface WeeklyDigestDay {
  label: string;
  mood: MoodValue;
}

export interface WeeklyDigest {
  bestDay: WeeklyDigestDay | null;
  hardestDay: WeeklyDigestDay | null;
  topActivities: { tag: string; count: number }[];
  trendComparison: string | null;
  emergingPattern: TagStat | null;
}

const daysAgo = (date: string, today: Date): number | null => {
  const instance = new Date(date);
  if (Number.isNaN(instance.getTime())) return null;
  instance.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - instance.getTime()) / (1000 * 60 * 60 * 24));
};

const filterEntriesByDayRange = (entries: Entry[], startInclusive: number, endExclusive: number): Entry[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return entries.filter((entry) => {
    const diff = daysAgo(entry.date, today);
    return diff != null && diff >= startInclusive && diff < endExclusive;
  });
};

const formatDayLabel = (date: string): string => {
  const instance = new Date(date);
  return Number.isNaN(instance.getTime()) ? date : instance.toLocaleDateString('en-US', { weekday: 'long' });
};

const averageMoodOf = (entries: Entry[]): number | null =>
  entries.length ? entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length : null;

const topTagsOf = (entries: Entry[], limit = 3): { tag: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const selection of entry.selections ?? []) {
      const key = selection.name || String(selection.id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const buildWeekOverWeekComparison = (
  thisWeekAverage: number | null,
  thisWeekSampleSize: number,
  lastWeekAverage: number | null,
): string | null => {
  if (
    thisWeekAverage == null ||
    lastWeekAverage == null ||
    thisWeekSampleSize < MIN_DAYS_FOR_WEEKLY_COMPARISON
  ) {
    return null;
  }
  const delta = thisWeekAverage - lastWeekAverage;
  if (Math.abs(delta) < WEEKLY_COMPARISON_MARGIN) return 'about the same as last week';
  return delta > 0 ? 'a bit higher than last week' : 'a bit lower than last week';
};

// A weekly recap composed entirely from data the stats hook already has — pure
// recomposition, no new plumbing. Leans on "associated with" framing (#11-13) and
// gives "pattern discovery" a more prominent narrative than streaks/volume (#1/#16).
export const buildWeeklyDigest = (
  pastEntries: Entry[] | null | undefined,
  tagStats: TagStats,
): WeeklyDigest => {
  const entries = pastEntries ?? [];
  const thisWeek = filterEntriesByDayRange(entries, 0, WEEK_LENGTH_DAYS);
  const lastWeek = filterEntriesByDayRange(entries, WEEK_LENGTH_DAYS, WEEK_LENGTH_DAYS * 2);

  const ranked = [...thisWeek].sort((a, b) => a.mood - b.mood);
  const hardest = ranked[0];
  const best = ranked[ranked.length - 1];

  const trendComparison = buildWeekOverWeekComparison(
    averageMoodOf(thisWeek),
    thisWeek.length,
    averageMoodOf(lastWeek),
  );

  const emergingPattern = [...tagStats.all]
    .sort((a, b) => b.count - a.count)
    .find((tag) => tag.confidence !== 'low') ?? null;

  return {
    bestDay: best ? { label: formatDayLabel(best.date), mood: best.mood } : null,
    hardestDay: hardest && hardest !== best ? { label: formatDayLabel(hardest.date), mood: hardest.mood } : null,
    topActivities: topTagsOf(thisWeek),
    trendComparison,
    emergingPattern,
  };
};
