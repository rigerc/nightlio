import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMoodEntries } from '../services/moodService';
import type { Entry } from '../types';

export const ENTRIES_QUERY_KEY = ['entries'] as const;

export interface UseMoodDataReturn {
  pastEntries: Entry[];
  loading: boolean;
  error: string | null;
  refreshHistory: () => Promise<void>;
}

export const useMoodData = (): UseMoodDataReturn => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ENTRIES_QUERY_KEY,
    queryFn: getMoodEntries,
  });

  return {
    pastEntries: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refreshHistory: () => queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY }),
  };
};
