import { Frown, Meh, Smile, Heart, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Entry, MoodValue } from '../types';

type MoodIcon = ComponentType<LucideProps>;

interface MoodDef {
  icon: MoodIcon;
  value: MoodValue;
  color: string;
  label: string;
  tag: string;
}

const cssVar = (name: string, fallback: string): string => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
};

export const MOODS: MoodDef[] = [
  { icon: Frown, value: 1, color: 'var(--mood-1)', label: 'Terrible', tag: 'dark+ambient' },
  { icon: Frown, value: 2, color: 'var(--mood-2)', label: 'Bad', tag: 'melancholic' },
  { icon: Meh,   value: 3, color: 'var(--mood-3)', label: 'Okay', tag: 'lofi+chill' },
  { icon: Smile, value: 4, color: 'var(--mood-4)', label: 'Good', tag: 'upbeat+pop' },
  { icon: Heart, value: 5, color: 'var(--mood-5)', label: 'Amazing', tag: 'synthwave+energy' },
];

export const getMoodIcon = (moodValue: number): { icon: MoodIcon; color: string } => {
  const mood = MOODS.find(m => m.value === moodValue);
  if (!mood) return { icon: Meh, color: cssVar('--mood-3', '#f1fa8c') };
  const resolved = mood.color.startsWith('var(')
    ? cssVar(mood.color.slice(4, -1), '#999')
    : mood.color;
  return { icon: mood.icon, color: resolved };
};

export const getMoodLabel = (moodValue: number): string => {
  const mood = MOODS.find(m => m.value === moodValue);
  return mood ? mood.label : 'Unknown';
};

export const formatEntryTime = (entry: Pick<Entry, 'date' | 'created_at'>): string => {
  if (entry.created_at) {
    const date = new Date(entry.created_at);
    const time = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${entry.date} at ${time}`;
  }
  return entry.date;
};

interface WeekDayData {
  date: string;
  mood: MoodValue | null;
  moodEmoji: MoodIcon | null;
  hasEntry: boolean;
}

export const getWeeklyMoodData = (pastEntries: Entry[], days = 7): WeekDayData[] => {
  const today = new Date();
  const weekData: WeekDayData[] = [];

  const entryLookup: Record<string, Entry> = {};
  pastEntries.forEach(entry => {
    entryLookup[entry.date] = entry;
  });

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString();
    const entry = entryLookup[dateStr];

    weekData.push({
      date: days <= 7
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: entry ? entry.mood : null,
      moodEmoji: entry ? getMoodIcon(entry.mood).icon : null,
      hasEntry: !!entry,
    });
  }

  return weekData;
};

export const movingAverage = (arr: (number | null)[], windowSize = 7): (number | null)[] => {
  const res: (number | null)[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = arr.slice(start, i + 1).filter((v): v is number => v != null);
    res.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null);
  }
  return res;
};
