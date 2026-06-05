import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import type { Statistics } from '../types';

export interface UseStatisticsReturn {
  statistics: Statistics | null;
  currentStreak: number;
  loading: boolean;
  error: string | null;
  loadStatistics: () => Promise<void>;
  refreshStreak: () => Promise<void>;
}

export const useStatistics = (): UseStatisticsReturn => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getStatistics();
      setStatistics(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStreak = useCallback(async (): Promise<void> => {
    try {
      const data = await apiService.getCurrentStreak();
      setCurrentStreak(data.current_streak);
    } catch (err) {
      console.error('Failed to load streak:', err);
      setCurrentStreak(0);
    }
  }, []);

  useEffect(() => {
    void loadStreak();
  }, [loadStreak]);

  return { statistics, currentStreak, loading, error, loadStatistics, refreshStreak: loadStreak };
};
