import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fitnessService from '../services/fitnessService';
import type { FitnessConnection } from '../types';

export const FITNESS_QUERY_KEY = ['fitness', 'status'] as const;

export interface UseFitnessDataReturn {
  connection: FitnessConnection | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  connect: () => Promise<void>;
  sync: (days?: number) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useFitnessData = (enabled = true): UseFitnessDataReturn => {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: connection = null, isLoading } = useQuery({
    queryKey: FITNESS_QUERY_KEY,
    queryFn: fitnessService.getFitnessStatus,
    enabled: enabled && Platform.OS === 'android',
    select: (data): FitnessConnection => ({
      connected: data.connected,
      provider: data.provider,
      last_synced_at: data.last_synced_at,
    }),
  });

  const connectMutation = useMutation({
    mutationFn: fitnessService.connectHealthConnect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FITNESS_QUERY_KEY }),
    onError: (err) => setError((err as Error).message),
  });

  const disconnectMutation = useMutation({
    mutationFn: fitnessService.disconnectHealthConnect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FITNESS_QUERY_KEY }),
    onError: (err) => setError((err as Error).message),
  });

  const connect = useCallback(async () => {
    setError(null);
    const granted = await connectMutation.mutateAsync();
    if (!granted) setError('Health Connect permissions were denied');
  }, [connectMutation]);

  const sync = useCallback(async (days = 30) => {
    setSyncing(true);
    setError(null);
    try {
      await fitnessService.syncFitnessData(days);
      await queryClient.invalidateQueries({ queryKey: FITNESS_QUERY_KEY });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [queryClient]);

  const disconnect = useCallback(async () => {
    setError(null);
    await disconnectMutation.mutateAsync();
  }, [disconnectMutation]);

  return {
    connection,
    loading: isLoading,
    syncing,
    error,
    connect,
    sync,
    disconnect,
  };
};
