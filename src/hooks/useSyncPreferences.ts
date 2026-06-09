import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSettingsStore } from '../store/useSettingsStore';

const moodIconsKey = (userId: number | undefined) => ['preferences', userId, 'mood-icons'] as const;
const timeFormatKey = (userId: number | undefined) => ['preferences', userId, 'time-format'] as const;

/** Hydrates the settings store from the server on login; mutations are exposed via the hooks below. */
export function useSyncPreferences(): void {
  const { user } = useAuth();
  const setMoodIconOverrides = useSettingsStore((s) => s.setMoodIconOverrides);
  const setUse24HourTime = useSettingsStore((s) => s.setUse24HourTime);

  const moodIconsQuery = useQuery({
    queryKey: moodIconsKey(user?.id),
    queryFn: () => apiService.getMoodIconPreferences(),
    enabled: Boolean(user),
  });

  const timeFormatQuery = useQuery({
    queryKey: timeFormatKey(user?.id),
    queryFn: () => apiService.getTimeFormatPreference(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) setMoodIconOverrides({});
    else if (moodIconsQuery.data) setMoodIconOverrides(moodIconsQuery.data.icons ?? {});
  }, [user, moodIconsQuery.data, setMoodIconOverrides]);

  useEffect(() => {
    if (!user) setUse24HourTime(false);
    else if (timeFormatQuery.data) setUse24HourTime(Boolean(timeFormatQuery.data.use_24_hour_time));
  }, [user, timeFormatQuery.data, setUse24HourTime]);
}

export function useUpdateMoodIcons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const setMoodIconOverrides = useSettingsStore((s) => s.setMoodIconOverrides);

  return useMutation({
    mutationFn: (icons: Record<string, string>) => apiService.saveMoodIconPreferences(icons),
    onMutate: async (icons) => {
      await queryClient.cancelQueries({ queryKey: moodIconsKey(user?.id) });
      const previous = useSettingsStore.getState().moodIconOverrides;
      setMoodIconOverrides(icons);
      return { previous };
    },
    onError: (_err, _icons, context) => {
      if (context) setMoodIconOverrides(context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: moodIconsKey(user?.id) });
    },
  });
}

export function useUpdateUse24HourTime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const setUse24HourTime = useSettingsStore((s) => s.setUse24HourTime);

  return useMutation({
    mutationFn: (value: boolean) => apiService.saveTimeFormatPreference(value),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: timeFormatKey(user?.id) });
      const previous = useSettingsStore.getState().use24HourTime;
      setUse24HourTime(value);
      return { previous };
    },
    onError: (_err, _value, context) => {
      if (context) setUse24HourTime(context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: timeFormatKey(user?.id) });
    },
  });
}
