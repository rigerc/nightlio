export type MoodValue = 1 | 2 | 3 | 4 | 5;

export interface MoodLog {
  id: number;
  entry_id: number;
  mood: MoodValue;
  logged_at: string;
}

export interface Selection {
  id: number;
  name: string;
  icon?: string | null;
  group_id: number;
  group_color?: string | null;
}

export interface Entry {
  id: number;
  mood: MoodValue;
  content: string;
  date: string;
  created_at: string;
  updated_at?: string;
  selections: Selection[];
  fitness?: FitnessDataPoint[];
}

export interface GroupOption {
  id: number;
  group_id: number;
  name: string;
  icon?: string;
  sort_order: number;
}

export interface Group {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  sort_order: number;
  options: GroupOption[];
}

export interface Goal {
  id: number;
  title: string;
  description?: string;
  frequency_per_week: number;
  completed: number;
  streak: number;
  period_start?: string;
  last_completed_date?: string;
  already_completed_today?: boolean;
}

export interface GoalCompletion {
  id: number;
  goal_id: number;
  user_id: number;
  date: string;
  created_at: string;
}

export interface Statistics {
  statistics: {
    total_entries: number;
    average_mood: number;
    [key: string]: unknown;
  };
  mood_distribution: Record<string, number>;
  current_streak: number;
}

export interface User {
  id: number;
  name: string;
  email?: string;
  avatar_url?: string;
}

export interface AppConfig {
  enable_google_oauth: boolean;
  enable_mood_music: boolean;
  enable_google_health: boolean;
  google_client_id?: string;
  google_health_client_id?: string;
}

export type FitnessDataType =
  | 'steps'
  | 'sleep_minutes'
  | 'heart_rate_avg'
  | 'calories'
  | 'active_minutes'
  | 'workout';

export interface FitnessDataPoint {
  id: number;
  data_type: FitnessDataType | string;
  date: string;
  value: number;
  metadata?: Record<string, unknown> | null;
  source_provider: string;
  created_at: string;
}

export interface FitnessConnection {
  connected: boolean;
  provider: string | null;
  last_synced_at: string | null;
}

export interface Achievement {
  id: number;
  user_id: number;
  achievement_type: string;
  earned_at: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
}

export interface MoodCreateResponse {
  status: string;
  entry_id: number;
  new_achievements: Achievement[];
  message: string;
}

export interface MoodUpdateResponse {
  status: string;
  message: string;
  entry: Entry;
}

export interface AuthResponse {
  token: string;
  user: User;
}
