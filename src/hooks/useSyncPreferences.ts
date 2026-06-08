import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSettingsStore } from '../store/useSettingsStore';

const MOOD_ICONS_KEY = ['preferences', 'mood-icons'] as const;
const TIME_FORMAT_KEY = ['preferences', 'time-format'] as const;

/** Hydrates the settings store from the server on login; mutations are exposed via the hooks below. */
export function useSyncPreferences(): void {
  const { user } = useAuth();
  const setMoodIconOverrides = useSettingsStore((s) => s.setMoodIconOverrides);
  const setUse24HourTime = useSettingsStore((s) => s.setUse24HourTime);

  const moodIconsQuery = useQuery({
    queryKey: MOOD_ICONS_KEY,
    queryFn: () => apiService.getMoodIconPreferences(),
    enabled: Boolean(user),
  });

  const timeFormatQuery = useQuery({
    queryKey: TIME_FORMAT_KEY,
    queryFn: () => apiService.getTimeFormatPreference(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (moodIconsQuery.data) setMoodIconOverrides(moodIconsQuery.data.icons ?? {});
  }, [moodIconsQuery.data, setMoodIconOverrides]);

  useEffect(() => {
    if (timeFormatQuery.data) setUse24HourTime(Boolean(timeFormatQuery.data.use_24_hour_time));
  }, [timeFormatQuery.data, setUse24HourTime]);
}

export function useUpdateMoodIcons() {
  const queryClient = useQueryClient();
  const setMoodIconOverrides = useSettingsStore((s) => s.setMoodIconOverrides);

  return useMutation({
    mutationFn: (icons: Record<string, string>) => apiService.saveMoodIconPreferences(icons),
    onMutate: async (icons) => {
      await queryClient.cancelQueries({ queryKey: MOOD_ICONS_KEY });
      const previous = useSettingsStore.getState().moodIconOverrides;
      setMoodIconOverrides(icons);
      return { previous };
    },
    onError: (_err, _icons, context) => {
      if (context) setMoodIconOverrides(context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: MOOD_ICONS_KEY });
    },
  });
}

export function useUpdateUse24HourTime() {
  const queryClient = useQueryClient();
  const setUse24HourTime = useSettingsStore((s) => s.setUse24HourTime);

  return useMutation({
    mutationFn: (value: boolean) => apiService.saveTimeFormatPreference(value),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: TIME_FORMAT_KEY });
      const previous = useSettingsStore.getState().use24HourTime;
      setUse24HourTime(value);
      return { previous };
    },
    onError: (_err, _value, context) => {
      if (context) setUse24HourTime(context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_FORMAT_KEY });
    },
  });
}
