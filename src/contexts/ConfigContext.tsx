import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import type { AppConfig } from '../types';

interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
  error: string | null;
}

const DEFAULT_CONFIG: AppConfig = { enable_google_oauth: false, enable_mood_music: false, enable_google_health: false };

const ConfigContext = createContext<ConfigContextValue | null>(null);

export const useConfig = (): ConfigContextValue => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
};

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const data = await api.getPublicConfig();
        if (isMounted) setConfig(prev => ({ ...prev, ...data }));
      } catch (e) {
        if (isMounted) setError((e as Error).message || 'Failed to load config');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
};
