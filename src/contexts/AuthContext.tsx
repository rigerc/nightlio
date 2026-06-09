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

export const ClerkAuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    apiService.setAuthToken('');
    setUser(null);
    void signOut();
  }, [signOut]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      apiService.setAuthToken('');
      setUser(null);
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
        if (isMounted) setUser(verified.user);
      } catch (error) {
        console.error('Clerk session verification failed:', error);
        apiService.setAuthToken('');
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [isLoaded, isSignedIn, getToken, clerkUser?.id]);

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
  const [token, setToken] = useState<string | null>(localStorage.getItem('waymark_token'));
  const autoSyncFired = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem('waymark_token');
    setToken(null);
    setUser(null);
    apiService.setAuthToken('');
  }, []);

  const localLogin = useCallback(async (accessKey?: string) => {
    try {
      setLoading(true);
      const response = await apiService.localLogin(accessKey);
      const { token: jwtToken, user: userData } = response;
      if (jwtToken) {
        localStorage.setItem('waymark_token', jwtToken);
        setToken(jwtToken);
        setUser(userData);
        apiService.setAuthToken(jwtToken);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Local login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyToken = useCallback(async () => {
    if (!token) return;
    try {
      const userData = await apiService.verifyToken(token);
      setUser(userData.user);
      apiService.setAuthToken(token);
    } catch {
      logout();
      if (!config.enable_google_oauth && !config.local_login_requires_access_key) {
        await localLogin();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [token, config.enable_google_oauth, config.local_login_requires_access_key, logout, localLogin]);

  useEffect(() => {
    if (configLoading) return;
    if (token) {
      void verifyToken();
    } else if (!config.enable_google_oauth && !config.local_login_requires_access_key) {
      void localLogin();
    } else {
      setLoading(false);
    }
  }, [token, configLoading, config.enable_google_oauth, config.local_login_requires_access_key, verifyToken, localLogin]);

  const login = useCallback(async (googleToken: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await apiService.googleAuth(googleToken);
      const { token: jwtToken, user: userData } = response;
      localStorage.setItem('waymark_token', jwtToken);
      setToken(jwtToken);
      setUser(userData);
      apiService.setAuthToken(jwtToken);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !config.enable_google_health || autoSyncFired.current) return;
    autoSyncFired.current = true;
    fitnessApi.sync(30).catch(() => {});
  }, [user, config.enable_google_health]);

  return (
    <AuthContext.Provider value={{ user, loading, login, localLogin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
