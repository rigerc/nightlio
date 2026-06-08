import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: string;
  colorScheme: string;
  setTheme: (theme: string) => void;
  setColorScheme: (colorScheme: string) => void;
  cycle: () => void;
}

function applyToDocument(theme: string, colorScheme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-color', colorScheme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      colorScheme: 'default',
      setTheme: (theme) => set({ theme }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      cycle: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'waymark:theme-store' }
  )
);

applyToDocument(useThemeStore.getState().theme, useThemeStore.getState().colorScheme);
useThemeStore.subscribe((state) => applyToDocument(state.theme, state.colorScheme));
