import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import apiService from '../services/api';
import type { Entry } from '../types';

export interface UseMoodDataReturn {
  pastEntries: Entry[];
  setPastEntries: Dispatch<SetStateAction<Entry[]>>;
  loading: boolean;
  error: string | null;
  refreshHistory: () => Promise<void>;
}

export const useMoodData = (): UseMoodDataReturn => {
  const [pastEntries, setPastEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMoodEntries();
      setPastEntries(data);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load mood history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return { pastEntries, setPastEntries, loading, error, refreshHistory: loadHistory };
};
