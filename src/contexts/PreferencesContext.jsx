import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';
import { useAuth } from './AuthContext';
import { getIconComponent } from '../utils/iconRegistry';

const DEFAULT_MOOD_ICON_NAMES = { 1: 'Frown', 2: 'Frown', 3: 'Meh', 4: 'Smile', 5: 'Heart' };

const PreferencesContext = createContext();

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export const PreferencesProvider = ({ children }) => {
  const [moodIconOverrides, setMoodIconOverrides] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    apiService.getMoodIconPreferences()
      .then(r => setMoodIconOverrides(r.icons ?? {}))
      .catch(() => {});
  }, [user]);

  const updateMoodIcons = async (icons) => {
    await apiService.saveMoodIconPreferences(icons);
    setMoodIconOverrides(icons);
  };

  const getMoodIconComponent = (moodValue) => {
    const key = String(moodValue);
    const name = moodIconOverrides[key] ?? DEFAULT_MOOD_ICON_NAMES[moodValue] ?? 'Meh';
    return getIconComponent(name);
  };

  return (
    <PreferencesContext.Provider value={{ moodIconOverrides, updateMoodIcons, getMoodIconComponent, DEFAULT_MOOD_ICON_NAMES }}>
      {children}
    </PreferencesContext.Provider>
  );
};
