import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import apiService from '../services/api';
import { fitnessApi } from '../services/fitnessApi';
import { useConfig } from './ConfigContext';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (googleToken: string) => Promise<{ success: boolean; error?: string }>;
  localLogin: (accessKey?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Shared session helpers used by both providers
function createSessionHandlers(
  setUser: React.Dispatch<React.SetStateAction<User | null>>
) {
  function initSession(token: string | null, userData: User) {
    setUser(userData);
    apiService.setAuthToken(token);
  }
  function clearSession() {
    setUser(null);
    apiService.setAuthToken(null);
  }
  return { initSession, clearSession };
}

// Fires a Google Health background sync once per session after the user is authenticated
function useAutoFitnessSync(user: User | null, enableGoogleHealth: boolean) {
  const autoSyncFired = useRef(false);
  useEffect(() => {
    if (!user || !enableGoogleHealth || autoSyncFired.current) return;
    autoSyncFired.current = true;
    fitnessApi.sync(30).catch(() => {});
  }, [user, enableGoogleHealth]);
}

export const ClerkAuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const { config } = useConfig();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { initSession, clearSession } = createSessionHandlers(setUser);

  useAutoFitnessSync(user, config.enable_google_health ?? false);

  const logout = useCallback(() => {
    clearSession();
    void signOut();
  }, [signOut]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      clearSession();
      setLoading(false);
      return;
    }

    let isMounted = true;
    void (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Missing Clerk session token');
        apiService.setAuthToken(token);
        const verified = await apiService.verifyToken(token);
        if (isMounted) initSession(token, verified.user);
      } catch (error) {
        console.error('Clerk session verification failed:', error);
        if (isMounted) clearSession();
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [isLoaded, isSignedIn, getToken, clerkUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Use Clerk sign-in to log in.' };
  }, []);

  const localLogin = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Local login is disabled while Clerk is active.' };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, localLogin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { config, loading: configLoading } = useConfig();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { initSession, clearSession } = createSessionHandlers(setUser);

  useAutoFitnessSync(user, config.enable_google_health ?? false);

  const logout = useCallback(() => {
    clearSession();
    void apiService.logout().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const localLogin = useCallback(async (accessKey?: string) => {
    try {
      setLoading(true);
      const response = await apiService.localLogin(accessKey);
      initSession(response.token ?? null, response.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Local login failed' };
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyToken = useCallback(async () => {
    try {
      const userData = await apiService.verifyToken();
      initSession(null, userData.user);
    } catch {
      clearSession();
      if (!config.enable_google_oauth && !config.local_login_requires_access_key) {
        await localLogin();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [config.enable_google_oauth, config.local_login_requires_access_key, localLogin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (configLoading) return;
    void verifyToken();
  }, [configLoading, verifyToken]);

  const login = useCallback(async (googleToken: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await apiService.googleAuth(googleToken);
      initSession(response.token ?? null, response.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, loading, login, localLogin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
