import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import apiService from '../services/api';
import { useConfig } from './ConfigContext';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (googleToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { config, loading: configLoading } = useConfig();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('waymark_token'));

  const logout = useCallback(() => {
    localStorage.removeItem('waymark_token');
    setToken(null);
    setUser(null);
    apiService.setAuthToken('');
  }, []);

  const localLogin = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.localLogin();
      const { token: jwtToken, user: userData } = response;
      if (jwtToken) {
        localStorage.setItem('waymark_token', jwtToken);
        setToken(jwtToken);
        setUser(userData);
        apiService.setAuthToken(jwtToken);
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Local login failed' };
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
      if (!config.enable_google_oauth) {
        await localLogin();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [token, config.enable_google_oauth, logout, localLogin]);

  useEffect(() => {
    if (configLoading) return;
    if (token) {
      void verifyToken();
    } else if (!config.enable_google_oauth) {
      void localLogin();
    } else {
      setLoading(false);
    }
  }, [token, configLoading, config.enable_google_oauth, verifyToken, localLogin]);

  const login = async (googleToken: string): Promise<{ success: boolean; error?: string }> => {
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
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
