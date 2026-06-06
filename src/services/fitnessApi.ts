import type { FitnessConnection, FitnessDataPoint } from '../types';
import apiService from './api';

export const fitnessApi = {
  getStatus(provider = 'google_health'): Promise<FitnessConnection> {
    return apiService.request<FitnessConnection>(`/api/fitness/status?provider=${encodeURIComponent(provider)}`);
  },

  storeTokens(t: {
    provider: string;
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }): Promise<void> {
    return apiService.request<void>('/api/fitness/tokens', {
      method: 'POST',
      body: JSON.stringify(t),
    });
  },

  sync(days = 30): Promise<{ status: string; rows_synced: number; provider: string }> {
    return apiService.request<{ status: string; rows_synced: number; provider: string }>(
      `/api/fitness/sync?days=${days}`,
      { method: 'POST' }
    );
  },

  disconnect(provider = 'google_health'): Promise<{ status: string }> {
    return apiService.request<{ status: string }>(
      `/api/fitness/disconnect?provider=${encodeURIComponent(provider)}`,
      { method: 'DELETE' }
    );
  },

  getData(p?: { start_date?: string; end_date?: string }): Promise<{ data: FitnessDataPoint[]; provider: string | null }> {
    const params = new URLSearchParams();
    if (p?.start_date) params.set('start_date', p.start_date);
    if (p?.end_date) params.set('end_date', p.end_date);
    const q = params.toString();
    return apiService.request<{ data: FitnessDataPoint[]; provider: string | null }>(
      `/api/fitness/data${q ? `?${q}` : ''}`
    );
  },
};
