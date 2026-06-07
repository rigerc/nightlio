import { useMemo } from 'react';
import { getWeeklyMoodData, movingAverage } from '../../utils/moodUtils';
import {
  DEFAULT_METRICS,
  EMPTY_OBJECT,
  buildCalendarDays,
  buildMoodDistributionData,
  buildMoodBaselineComparison,
  buildWeeklyDigest,
  aggregateTagStats,
  buildOverviewCards,
} from './statisticsViewUtils';
import type { CalendarDay, MoodDistributionDatum, OverviewCard, TagStats, WeeklyDigest } from './statisticsViewUtils';
import type { Entry, MoodValue, Statistics } from '../../types';

interface WeeklyMoodPoint {
  date: string;
  mood: number | null;
  ma?: number | null;
}

interface UseStatisticsViewDataReturn {
  hasStatistics: boolean;
  weeklyMoodData: WeeklyMoodPoint[];
  trendChartData: WeeklyMoodPoint[];
  moodDistribution: Record<string, number>;
  moodDistributionData: MoodDistributionDatum[];
  tagStats: TagStats;
  calendarDays: CalendarDay[];
  overviewCards: OverviewCard[];
  weeklyDigest: WeeklyDigest;
}

const useStatisticsViewData = (
  statistics: Statistics | null,
  pastEntries: Entry[],
  range: number,
): UseStatisticsViewDataReturn => {
  const hasStatistics = Boolean(statistics);
  const metrics = statistics?.statistics ?? DEFAULT_METRICS;
  const currentStreak = statistics?.current_streak ?? 0;

  const moodDistribution = useMemo(
    () => statistics?.mood_distribution ?? EMPTY_OBJECT,
    [statistics?.mood_distribution],
  );

  const weeklyMoodData = useMemo(() => getWeeklyMoodData(pastEntries, range), [pastEntries, range]);

  // Always compares the last 7 days to the personal all-time average — independent of
  // the selected chart range — so "Average Mood" reads as a relative signal (#5/#14)
  // rather than just a raw number.
  const recentMoodComparison = useMemo(() => {
    const recentMoods = getWeeklyMoodData(pastEntries, 7)
      .map((d) => d.mood)
      .filter((mood): mood is MoodValue => mood != null);
    if (!recentMoods.length) return null;
    const recentAverage = recentMoods.reduce((sum: number, mood) => sum + mood, 0) / recentMoods.length;
    return buildMoodBaselineComparison(recentAverage, recentMoods.length, metrics.average_mood);
  }, [pastEntries, metrics.average_mood]);

  const movingAverageSeries = useMemo(
    () => movingAverage(weeklyMoodData.map((d) => d.mood), 7),
    [weeklyMoodData],
  );

  const trendChartData = useMemo(
    () => weeklyMoodData.map((point, index) => ({ ...point, ma: movingAverageSeries[index] })),
    [weeklyMoodData, movingAverageSeries],
  );

  const moodDistributionData = useMemo(
    () => buildMoodDistributionData(moodDistribution),
    [moodDistribution],
  );

  const tagStats = useMemo(() => aggregateTagStats(pastEntries), [pastEntries]);

  const weeklyDigest = useMemo(() => buildWeeklyDigest(pastEntries, tagStats), [pastEntries, tagStats]);

  const calendarDays = useMemo(() => buildCalendarDays(pastEntries), [pastEntries]);

  const bestDayCount = useMemo(() => {
    const counts = Object.values(moodDistribution ?? {});
    return counts.length ? Math.max(...counts) : 0;
  }, [moodDistribution]);

  const overviewCards = useMemo(
    () =>
      buildOverviewCards({
        totalEntries: metrics.total_entries ?? 0,
        averageMood: metrics.average_mood,
        currentStreak,
        bestDayCount,
        recentMoodComparison,
      }),
    [metrics.total_entries, metrics.average_mood, currentStreak, bestDayCount, recentMoodComparison],
  );

  return {
    hasStatistics,
    weeklyMoodData,
    trendChartData,
    moodDistribution,
    moodDistributionData,
    tagStats,
    calendarDays,
    overviewCards,
    weeklyDigest,
  };
};

export default useStatisticsViewData;
