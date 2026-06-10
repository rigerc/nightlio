import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStatistics } from '../services/moodService';
import type { Statistics } from '../types';

export const STATISTICS_QUERY_KEY = ['statistics'] as const;

export interface UseStatisticsReturn {
  statistics: Statistics | null;
  currentStreak: number;
  loading: boolean;
  error: string | null;
  loadStatistics: () => Promise<void>;
  refreshStreak: () => Promise<void>;
}

export const useStatistics = (): UseStatisticsReturn => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: STATISTICS_QUERY_KEY,
    queryFn: getStatistics,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: STATISTICS_QUERY_KEY });

  const statistics: Statistics | null = data
    ? {
        statistics: data.statistics,
        mood_distribution: data.mood_distribution,
        current_streak: data.current_streak,
      }
    : null;

  return {
    statistics,
    currentStreak: data?.current_streak ?? 0,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    loadStatistics: refresh,
    refreshStreak: refresh,
  };
};
