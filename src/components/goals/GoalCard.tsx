import { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Target, Trash2, CheckCircle, Flame } from 'lucide-react-native';
import { ProgressBar } from '../ui/ProgressBar';
import type { Goal } from '../../types';

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: number) => Promise<void>;
  onMarkDone: (id: number) => Promise<void>;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function GoalCard({ goal, onDelete, onMarkDone }: GoalCardProps) {
  const [loading, setLoading] = useState(false);
  const today = todayStr();
  const isDoneToday = goal.already_completed_today || goal.last_completed_date === today;
  const isCompleted = goal.completed >= goal.frequency_per_week;
  const pct = goal.frequency_per_week > 0 ? (goal.completed / goal.frequency_per_week) * 100 : 0;

  const handleDelete = () => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try { await onDelete(goal.id); } finally { setLoading(false); }
        },
      },
    ]);
  };

  const handleMarkDone = async () => {
    if (isDoneToday) return;
    setLoading(true);
    try { await onMarkDone(goal.id); } finally { setLoading(false); }
  };

  return (
    <View className="mx-4 mb-3 p-4 bg-card border border-border rounded-xl" style={{ opacity: loading ? 0.6 : 1 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
            <Target size={15} color="#8b5cf6" />
          </View>
          <Text className="text-xs text-muted-foreground">
            {goal.frequency_per_week}x / week
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {goal.streak > 0 && (
            <View className="flex-row items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full">
              <Flame size={12} color="#f97316" />
              <Text className="text-xs font-medium text-orange-500">{goal.streak}</Text>
            </View>
          )}
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Trash2 size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      {/* Title */}
      <Text className="font-semibold text-foreground text-base mb-1">{goal.title}</Text>
      {goal.description ? (
        <Text className="text-sm text-muted-foreground mb-3">{goal.description}</Text>
      ) : null}

      {/* Progress */}
      <View className="mb-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-xs text-muted-foreground">Progress</Text>
          <Text className="text-xs text-muted-foreground">
            {goal.completed}/{goal.frequency_per_week}
          </Text>
        </View>
        <ProgressBar
          value={goal.completed}
          max={goal.frequency_per_week}
          color={isCompleted ? '#22c55e' : '#8b5cf6'}
        />
      </View>

      {/* Mark done button */}
      <Pressable
        onPress={handleMarkDone}
        disabled={isDoneToday || loading}
        className={`flex-row items-center justify-center gap-2 py-2 rounded-lg ${
          isDoneToday ? 'bg-green-500/20' : 'bg-primary'
        }`}
      >
        {loading ? (
          <ActivityIndicator size="small" color={isDoneToday ? '#22c55e' : 'white'} />
        ) : (
          <>
            <CheckCircle size={15} color={isDoneToday ? '#22c55e' : 'white'} />
            <Text className={`text-sm font-semibold ${isDoneToday ? 'text-green-500' : 'text-white'}`}>
              {isDoneToday ? 'Done today' : 'Mark as done'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
