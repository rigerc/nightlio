import { create } from 'zustand';
import { Appearance } from 'react-native';

interface ThemeState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  cycle: () => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: Appearance.getColorScheme() === 'light' ? 'light' : 'dark',
  setTheme: (theme) => set({ theme }),
  cycle: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
}));
