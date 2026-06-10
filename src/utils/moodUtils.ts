import type { Entry, MoodValue } from '../types';

export const MOOD_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#8b5cf6',
};

interface MoodDef {
  value: MoodValue;
  color: string;
  label: string;
  iconName: string;
}

export const MOODS: MoodDef[] = [
  { value: 1, color: MOOD_COLORS[1], label: 'Terrible', iconName: 'Frown' },
  { value: 2, color: MOOD_COLORS[2], label: 'Bad', iconName: 'Frown' },
  { value: 3, color: MOOD_COLORS[3], label: 'Okay', iconName: 'Meh' },
  { value: 4, color: MOOD_COLORS[4], label: 'Good', iconName: 'Smile' },
  { value: 5, color: MOOD_COLORS[5], label: 'Amazing', iconName: 'Heart' },
];

export const getMoodColor = (moodValue: number): string => {
  return MOOD_COLORS[moodValue] ?? '#999999';
};

export const getMoodLabel = (moodValue: number): string => {
  return MOODS.find((m) => m.value === moodValue)?.label ?? 'Unknown';
};

export const getMoodIconName = (moodValue: number): string => {
  return MOODS.find((m) => m.value === moodValue)?.iconName ?? 'Meh';
};

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  hasEntry: boolean;
}

export const getWeeklyMoodData = (pastEntries: Entry[], days = 7): WeekDayData[] => {
  const today = new Date();
  const weekData: WeekDayData[] = [];

  const entryLookup: Record<string, Entry> = {};
  pastEntries.forEach((entry) => {
    entryLookup[entry.date] = entry;
  });

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = toDateKey(date);
    const entry = entryLookup[dateStr];

    weekData.push({
      date:
        days <= 7
          ? date.toLocaleDateString('en-US', { weekday: 'short' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: entry ? entry.mood : null,
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
