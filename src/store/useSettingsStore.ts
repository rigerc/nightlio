import { create } from 'zustand';

interface SettingsState {
  moodIconOverrides: Record<string, string>;
  use24HourTime: boolean;
  setMoodIconOverrides: (icons: Record<string, string>) => void;
  setUse24HourTime: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  moodIconOverrides: {},
  use24HourTime: false,
  setMoodIconOverrides: (moodIconOverrides) => set({ moodIconOverrides }),
  setUse24HourTime: (use24HourTime) => set({ use24HourTime }),
}));
