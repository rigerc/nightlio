import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as preferenceService from '../services/preferenceService';
import { useSettingsStore } from '../store/useSettingsStore';
import { getIconComponent, type IconComponent } from '../utils/iconRegistry';
import type { MoodValue } from '../types';

export const PREFS_QUERY_KEY = ['preferences'] as const;

export const DEFAULT_MOOD_ICON_NAMES: Record<MoodValue, string> = {
  1: 'Frown',
  2: 'Meh',
  3: 'CircleMinus',
  4: 'Smile',
  5: 'Laugh',
};

export interface UsePreferencesReturn {
  moodIconOverrides: Record<string, string>;
  use24HourTime: boolean;
  updateMoodIcons: (icons: Record<string, string>) => Promise<void>;
  updateUse24HourTime: (value: boolean) => Promise<void>;
  getMoodIconComponent: (moodValue: number) => IconComponent;
  formatTime: (date: Date) => string;
  DEFAULT_MOOD_ICON_NAMES: Record<MoodValue, string>;
}

export const usePreferences = (): UsePreferencesReturn => {
  const queryClient = useQueryClient();
  const setMoodIconOverrides = useSettingsStore((s) => s.setMoodIconOverrides);
  const setUse24HourTime = useSettingsStore((s) => s.setUse24HourTime);
  const moodIconOverrides = useSettingsStore((s) => s.moodIconOverrides);
  const use24HourTime = useSettingsStore((s) => s.use24HourTime);

  const { data } = useQuery({
    queryKey: PREFS_QUERY_KEY,
    queryFn: preferenceService.getPreferences,
  });

  useEffect(() => {
    if (data) {
      setMoodIconOverrides(data.mood_icons ?? {});
      setUse24HourTime(data.use_24_hour_time);
    }
  }, [data, setMoodIconOverrides, setUse24HourTime]);

  const moodIconsMutation = useMutation({
    mutationFn: preferenceService.saveMoodIcons,
    onMutate: async (icons) => {
      await queryClient.cancelQueries({ queryKey: PREFS_QUERY_KEY });
      const prev = useSettingsStore.getState().moodIconOverrides;
      setMoodIconOverrides(icons);
      return { prev };
    },
    onError: (_err, _icons, ctx) => {
      if (ctx) setMoodIconOverrides(ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PREFS_QUERY_KEY }),
  });

  const timeFormatMutation = useMutation({
    mutationFn: preferenceService.saveTimeFormat,
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: PREFS_QUERY_KEY });
      const prev = useSettingsStore.getState().use24HourTime;
      setUse24HourTime(value);
      return { prev };
    },
    onError: (_err, _value, ctx) => {
      if (ctx) setUse24HourTime(ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PREFS_QUERY_KEY }),
  });

  const getMoodIconComponent = (moodValue: number): IconComponent => {
    const key = String(moodValue);
    const name = moodIconOverrides[key] ?? DEFAULT_MOOD_ICON_NAMES[moodValue as MoodValue] ?? 'Meh';
    return getIconComponent(name);
  };

  const formatTime = (date: Date): string =>
    date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24HourTime,
    });

  return {
    moodIconOverrides,
    use24HourTime,
    updateMoodIcons: (icons) => moodIconsMutation.mutateAsync(icons),
    updateUse24HourTime: (value) => timeFormatMutation.mutateAsync(value),
    getMoodIconComponent,
    formatTime,
    DEFAULT_MOOD_ICON_NAMES,
  };
};
