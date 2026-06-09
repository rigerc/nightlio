import { useSettingsStore } from '../store/useSettingsStore';
import { useSyncPreferences, useUpdateMoodIcons, useUpdateUse24HourTime } from './useSyncPreferences';
import { getIconComponent, type IconComponent } from '../utils/iconRegistry';
import type { MoodValue } from '../types';

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
  updateUse24HourTime: (use24HourTime: boolean) => Promise<void>;
  getMoodIconComponent: (moodValue: number) => IconComponent;
  formatTime: (date: Date) => string;
  DEFAULT_MOOD_ICON_NAMES: Record<MoodValue, string>;
}

/** Thin selector layer over useSettingsStore + useSyncPreferences, kept for the existing component surface. */
export const usePreferences = (): UsePreferencesReturn => {
  useSyncPreferences();

  const moodIconOverrides = useSettingsStore((s) => s.moodIconOverrides);
  const use24HourTime = useSettingsStore((s) => s.use24HourTime);
  const moodIconsMutation = useUpdateMoodIcons();
  const timeFormatMutation = useUpdateUse24HourTime();

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
    updateMoodIcons: async (icons) => {
      await moodIconsMutation.mutateAsync(icons);
    },
    updateUse24HourTime: async (value) => {
      await timeFormatMutation.mutateAsync(value);
    },
    getMoodIconComponent,
    formatTime,
    DEFAULT_MOOD_ICON_NAMES,
  };
};
