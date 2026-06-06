import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface ThemeContextValue {
  theme: string;
  colorScheme: string;
  setTheme: (t: string) => void;
  setColorScheme: (s: string) => void;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colorScheme: 'default',
  setTheme: () => {},
  setColorScheme: () => {},
  cycle: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('waymark:theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [colorScheme, setColorScheme] = useState<string>(() => {
    try {
      return localStorage.getItem('waymark:color-scheme') || 'default';
    } catch {
      return 'default';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color', colorScheme);
    try {
      localStorage.setItem('waymark:theme', theme);
      localStorage.setItem('waymark:color-scheme', colorScheme);
    } catch { /* ignore */ }
  }, [theme, colorScheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    colorScheme,
    setTheme,
    setColorScheme,
    cycle: () => setTheme(t => (t === 'light' ? 'dark' : 'light')),
  }), [theme, colorScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
