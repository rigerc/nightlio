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
  updateMoodIcons: (icons: Record<string, string>) => Promise<void>;
  getMoodIconComponent: (moodValue: number) => IconComponent;
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
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    apiService.getMoodIconPreferences()
      .then(r => setMoodIconOverrides(r.icons ?? {}))
      .catch(() => {});
  }, [user]);

  const updateMoodIcons = async (icons: Record<string, string>): Promise<void> => {
    await apiService.saveMoodIconPreferences(icons);
    setMoodIconOverrides(icons);
  };

  const getMoodIconComponent = (moodValue: number): IconComponent => {
    const key = String(moodValue);
    const name = moodIconOverrides[key] ?? DEFAULT_MOOD_ICON_NAMES[moodValue as MoodValue] ?? 'Meh';
    return getIconComponent(name);
  };

  return (
    <PreferencesContext.Provider value={{ moodIconOverrides, updateMoodIcons, getMoodIconComponent, DEFAULT_MOOD_ICON_NAMES }}>
      {children}
    </PreferencesContext.Provider>
  );
};
