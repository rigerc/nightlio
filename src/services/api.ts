import type {
  AppConfig, AuthResponse, Entry, Goal, GoalCompletion, Group, GroupType,
  MoodCreateResponse, MoodUpdateResponse, MoodLog, Selection, SliderValue, Statistics, Achievement,
} from '../types';

function normalizeBaseUrl(raw: string | undefined): string {
  let v = raw ?? '';
  if (typeof v !== 'string') v = String(v);
  v = v.trim();
  if (v === '""' || v === "''") v = '';
  v = v.replace(/^['"]+|['"]+$/g, '');
  v = v.replace(/["']/g, '');
  v = v.replace(/\/+$/g, '');
  return v;
}

const API_BASE_URL = normalizeBaseUrl(
  (typeof import.meta !== 'undefined' && import.meta.env && 'VITE_API_URL' in import.meta.env)
    ? (import.meta.env.VITE_API_URL as string)
    : ''
);

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class ApiService {
  private token: string | null = null;

  setAuthToken(token: string): void {
    this.token = token;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const base = API_BASE_URL;
    let url: string;
    if (!base) {
      url = path;
    } else if (/^https?:\/\//i.test(base)) {
      url = `${base}${path}`;
    } else {
      const baseNoTrail = base.replace(/\/+$/g, '');
      if (path === baseNoTrail || path.startsWith(`${baseNoTrail}/`)) {
        url = path;
      } else {
        url = `${baseNoTrail}${path}`;
      }
    }

    const config: RequestOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      (config.headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string };
          if (errorData && (errorData.error || errorData.message)) {
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } else {
          const text = await response.text().catch(() => '');
          if (text) errorMessage += ` | body: ${text.slice(0, 200)}`;
        }
        throw new Error(errorMessage);
      }
      if (response.status === 204) return undefined as T;
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but received: ${ct || 'unknown'} | body: ${text.slice(0, 200)}`);
      }
      return await response.json() as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  getPublicConfig(): Promise<AppConfig> {
    return this.request<AppConfig>('/api/config');
  }

  googleAuth(googleToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: googleToken }),
    });
  }

  localLogin(accessKey?: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/local/login', {
      method: 'POST',
      body: JSON.stringify(accessKey ? { access_key: accessKey } : {}),
    });
  }

  verifyToken(token: string): Promise<{ user: AuthResponse['user'] }> {
    return this.request<{ user: AuthResponse['user'] }>('/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getMoodEntries(): Promise<Entry[]> {
    return this.request<Entry[]>('/api/moods');
  }

  createMoodEntry(entryData: {
    mood: number;
    date: string;
    content: string;
    time?: string;
    selected_options?: number[];
    slider_values?: Record<number, number>;
    is_important?: boolean;
    important_reason?: string;
  }): Promise<MoodCreateResponse> {
    return this.request<MoodCreateResponse>('/api/mood', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  updateMoodEntry(entryId: number, entryData: Partial<{
    mood: number;
    date: string;
    content: string;
    time: string;
    selected_options: number[];
    slider_values: Record<number, number>;
    is_important: boolean;
    important_reason: string;
  }>): Promise<MoodUpdateResponse> {
    return this.request<MoodUpdateResponse>(`/api/mood/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(entryData),
    });
  }

  deleteMoodEntry(entryId: number): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/mood/${entryId}`, {
      method: 'DELETE',
    });
  }

  getStatistics(): Promise<Statistics> {
    return this.request<Statistics>('/api/statistics');
  }

  getCurrentStreak(): Promise<{ current_streak: number; message: string }> {
    return this.request<{ current_streak: number; message: string }>('/api/streak');
  }

  getGroups(): Promise<Group[]> {
    return this.request<Group[]>('/api/groups');
  }

  createGroup(groupData: {
    name: string;
    type?: GroupType;
    slider_min?: number;
    slider_max?: number;
    slider_labels?: string[];
  }): Promise<{ status: string; group_id: number; message: string }> {
    return this.request<{ status: string; group_id: number; message: string }>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  createGroupOption(groupId: number, optionData: { name: string }): Promise<{ status: string; option_id: number; message: string }> {
    return this.request<{ status: string; option_id: number; message: string }>(`/api/groups/${groupId}/options`, {
      method: 'POST',
      body: JSON.stringify(optionData),
    });
  }

  updateGroup(groupId: number, data: Partial<{
    name: string;
    color: string;
    icon: string;
    sort_order: number;
    type: GroupType;
    slider_min: number;
    slider_max: number;
    slider_labels: string[] | null;
  }>): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteGroup(groupId: number): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  reorderGroups(orderedIds: number[]): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/groups/reorder', {
      method: 'POST',
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
  }

  updateGroupOption(optionId: number, data: Partial<{ name: string; icon: string; sort_order: number }>): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/options/${optionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteGroupOption(optionId: number): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/options/${optionId}`, {
      method: 'DELETE',
    });
  }

  reorderGroupOptions(groupId: number, orderedIds: number[]): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/groups/${groupId}/options/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
  }

  getEntrySelections(entryId: number): Promise<Selection[]> {
    return this.request<Selection[]>(`/api/mood/${entryId}/selections`);
  }

  getEntrySliderValues(entryId: number): Promise<SliderValue[]> {
    return this.request<SliderValue[]>(`/api/mood/${entryId}/slider-values`);
  }

  getMoodLogs(entryId: number): Promise<MoodLog[]> {
    return this.request<MoodLog[]>(`/api/mood/${entryId}/logs`);
  }

  addMoodLog(
    entryId: number,
    data: { mood: number },
  ): Promise<{ status: string; log_id: number; mood: number; logged_at: string | null; updated_entry_mood: number; message: string }> {
    return this.request(`/api/mood/${entryId}/logs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteMoodLog(
    entryId: number,
    logId: number,
  ): Promise<{ status: string; updated_entry_mood: number; message: string }> {
    return this.request(`/api/mood/${entryId}/logs/${logId}`, { method: 'DELETE' });
  }

  getMoodIconPreferences(): Promise<{ icons: Record<string, string> }> {
    return this.request<{ icons: Record<string, string> }>('/api/preferences/mood-icons');
  }

  saveMoodIconPreferences(icons: Record<string, string>): Promise<{ status: string; icons: Record<string, string> }> {
    return this.request<{ status: string; icons: Record<string, string> }>('/api/preferences/mood-icons', {
      method: 'PUT',
      body: JSON.stringify({ icons }),
    });
  }

  getTimeFormatPreference(): Promise<{ use_24_hour_time: boolean }> {
    return this.request<{ use_24_hour_time: boolean }>('/api/preferences/time-format');
  }

  saveTimeFormatPreference(use24HourTime: boolean): Promise<{ status: string; use_24_hour_time: boolean }> {
    return this.request<{ status: string; use_24_hour_time: boolean }>('/api/preferences/time-format', {
      method: 'PUT',
      body: JSON.stringify({ use_24_hour_time: use24HourTime }),
    });
  }

  getUserAchievements(): Promise<Achievement[]> {
    return this.request<Achievement[]>('/api/achievements');
  }

  checkAchievements(): Promise<{ new_achievements: Achievement[]; count: number }> {
    return this.request<{ new_achievements: Achievement[]; count: number }>('/api/achievements/check', {
      method: 'POST',
    });
  }

  getAchievementsProgress(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/api/achievements/progress');
  }

  getGoals(): Promise<Goal[]> {
    return this.request<Goal[]>('/api/goals');
  }

  createGoal(goal: { title: string; description?: string; frequency_per_week?: number; frequency?: number | string }): Promise<{ id: number }> {
    const payload: { title: string; description?: string; frequency_per_week?: number } = {
      title: goal.title,
      description: goal.description,
    };
    if (goal.frequency_per_week) {
      payload.frequency_per_week = goal.frequency_per_week;
    } else if (goal.frequency) {
      const n = parseInt(String(goal.frequency).trim(), 10);
      if (!Number.isNaN(n)) payload.frequency_per_week = n;
    }
    return this.request<{ id: number }>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateGoal(goalId: number, patch: { title?: string; description?: string; frequency_per_week?: number; frequency?: number | string }): Promise<{ status: string }> {
    const payload: { title?: string; description?: string; frequency_per_week?: number } = {
      title: patch.title,
      description: patch.description,
    };
    if (patch.frequency_per_week) {
      payload.frequency_per_week = patch.frequency_per_week;
    } else if (patch.frequency) {
      const n = parseInt(String(patch.frequency).trim(), 10);
      if (!Number.isNaN(n)) payload.frequency_per_week = n;
    }
    return this.request<{ status: string }>(`/api/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteGoal(goalId: number): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/goals/${goalId}`, { method: 'DELETE' });
  }

  incrementGoalProgress(goalId: number): Promise<Goal> {
    return this.request<Goal>(`/api/goals/${goalId}/progress`, { method: 'POST' });
  }

  getGoalCompletions(goalId: number, { start, end }: { start?: string; end?: string } = {}): Promise<GoalCompletion[]> {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const q = params.toString();
    return this.request<GoalCompletion[]>(`/api/goals/${goalId}/completions${q ? `?${q}` : ''}`);
  }
}

const apiService = new ApiService();
export default apiService;
