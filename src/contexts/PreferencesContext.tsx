import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import apiService from '../services/api';
import { useAuth } from './AuthContext';
import { getIconComponent, type IconComponent } from '../utils/iconRegistry';
import type { MoodValue } from '../types';

const DEFAULT_MOOD_ICON_NAMES: Record<MoodValue, string> = {
  1: 'Frown',
  2: 'Frown',
  3: 'Meh',
  4: 'Smile',
  5: 'Heart',
};

interface PreferencesContextValue {
  moodIconOverrides: Record<string, string>;
  use24HourTime: boolean;
  updateMoodIcons: (icons: Record<string, string>) => Promise<void>;
  updateUse24HourTime: (use24HourTime: boolean) => Promise<void>;
  getMoodIconComponent: (moodValue: number) => IconComponent;
  formatTime: (date: Date) => string;
  DEFAULT_MOOD_ICON_NAMES: Record<MoodValue, string>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
};

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [moodIconOverrides, setMoodIconOverrides] = useState<Record<string, string>>({});
  const [use24HourTime, setUse24HourTime] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    void Promise.all([
      apiService.getMoodIconPreferences()
        .then(r => setMoodIconOverrides(r.icons ?? {}))
        .catch(() => {}),
      apiService.getTimeFormatPreference()
        .then(r => setUse24HourTime(Boolean(r.use_24_hour_time)))
        .catch(() => {}),
    ]);
  }, [user]);

  const updateMoodIcons = async (icons: Record<string, string>): Promise<void> => {
    await apiService.saveMoodIconPreferences(icons);
    setMoodIconOverrides(icons);
  };

  const updateUse24HourTime = async (nextUse24HourTime: boolean): Promise<void> => {
    await apiService.saveTimeFormatPreference(nextUse24HourTime);
    setUse24HourTime(nextUse24HourTime);
  };

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

  return (
    <PreferencesContext.Provider
      value={{
        moodIconOverrides,
        use24HourTime,
        updateMoodIcons,
        updateUse24HourTime,
        getMoodIconComponent,
        formatTime,
        DEFAULT_MOOD_ICON_NAMES,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};
