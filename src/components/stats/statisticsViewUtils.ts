import { Frown, Meh, Smile, Heart } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { getMoodIcon } from '../../utils/moodUtils';
import type { Entry } from '../../types';

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
  tone: 'default' | 'danger';
}

export interface TagStat {
  tag: string;
  count: number;
  avgMood: number;
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
export const MIN_TAG_OCCURRENCES = 2;

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
}: {
  totalEntries: number;
  averageMood: number | undefined;
  currentStreak: number;
  bestDayCount: number;
}): OverviewCard[] => [
  { key: 'totalEntries', value: totalEntries, label: 'Total Entries', tone: 'default' },
  {
    key: 'averageMood',
    value: typeof averageMood === 'number' ? averageMood.toFixed(1) : averageMood ?? '0.0',
    label: 'Average Mood',
    tone: 'default',
  },
  { key: 'currentStreak', value: currentStreak, label: 'Current Streak', tone: 'danger' },
  { key: 'bestDay', value: bestDayCount, label: 'Best Day', tone: 'default' },
];
