import { useState, useEffect, useCallback } from 'react';
import { generatePkce, randomState, buildAuthorizationUrl, exchangeCode, GOOGLE_HEALTH_SCOPES } from 'googlehealth';
import type { FitnessConnection } from '../types';
import { fitnessApi } from '../services/fitnessApi';

const PKCE_KEY = 'fitness_cv';
const STATE_KEY = 'fitness_state';

export interface UseFitnessDataReturn {
  connection: FitnessConnection | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  connect: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
  sync: (days?: number) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useFitnessData = (enabled: boolean, clientId?: string): UseFitnessDataReturn => {
  const [connection, setConnection] = useState<FitnessConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const status = await fitnessApi.getStatus();
      setConnection(status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const connect = useCallback(async () => {
    if (!clientId) {
      setError('Google Health client ID not configured');
      return;
    }
    setError(null);
    const { codeVerifier, codeChallenge, codeChallengeMethod } = await generatePkce();
    const state = randomState();
    sessionStorage.setItem(PKCE_KEY, codeVerifier);
    sessionStorage.setItem(STATE_KEY, state);
    const redirectUri = `${window.location.origin}/dashboard/settings`;
    const url = buildAuthorizationUrl({
      clientId,
      redirectUri,
      scopes: [
        GOOGLE_HEALTH_SCOPES.activityAndFitnessReadonly,
        GOOGLE_HEALTH_SCOPES.sleepReadonly,
        GOOGLE_HEALTH_SCOPES.healthMetricsReadonly,
      ],
      state,
      codeChallenge,
      codeChallengeMethod,
      accessType: 'offline',
    });
    window.location.href = url;
  }, [clientId]);

  const sync = useCallback(async (days = 30) => {
    setSyncing(true);
    setError(null);
    try {
      await fitnessApi.sync(days);
      await fetchStatus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [fetchStatus]);

  const handleCallback = useCallback(async (code: string) => {
    if (!clientId) return;
    const codeVerifier = sessionStorage.getItem(PKCE_KEY);
    if (!codeVerifier) {
      setError('Missing PKCE verifier — please try connecting again');
      return;
    }
    const redirectUri = `${window.location.origin}/dashboard/settings`;
    setLoading(true);
    setError(null);
    try {
      const tokens = await exchangeCode({ clientId, code, redirectUri, codeVerifier });
      sessionStorage.removeItem(PKCE_KEY);
      sessionStorage.removeItem(STATE_KEY);
      await fitnessApi.storeTokens({
        provider: 'google_health',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresAt
          ? Math.round((tokens.expiresAt - Date.now()) / 1000)
          : undefined,
      });
      await fetchStatus();
      setSyncing(true);
      await fitnessApi.sync(30);
      await fetchStatus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [clientId, fetchStatus]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await fitnessApi.disconnect();
      setConnection(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  return { connection, loading, syncing, error, connect, handleCallback, sync, disconnect };
};
