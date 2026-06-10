import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, createGoal, deleteGoal, incrementGoalProgress } from '../../services/goalService';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';
import type { Goal } from '../../types';

export const GOALS_QUERY_KEY = ['goals'] as const;

export function GoalsList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: getGoals,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: invalidate,
  });

  const progressMutation = useMutation({
    mutationFn: incrementGoalProgress,
    onSuccess: invalidate,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; frequency_per_week: number }) =>
      createGoal(data),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-foreground">Goals</Text>
        <Pressable
          onPress={() => setShowForm(true)}
          className="flex-row items-center gap-1 bg-primary px-3 py-1.5 rounded-lg"
        >
          <Plus size={16} color="white" />
          <Text className="text-white font-semibold text-sm">New</Text>
        </Pressable>
      </View>

      {goals.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-muted-foreground text-center mb-4">
            No goals yet. Create one to start tracking your habits.
          </Text>
          <Pressable
            onPress={() => setShowForm(true)}
            className="bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Create Goal</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={goals as Goal[]}
          keyExtractor={(g) => String(g.id)}
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              onDelete={(id) => deleteMutation.mutateAsync(id).then(() => {})}
              onMarkDone={(id) => progressMutation.mutateAsync(id).then(() => {})}
            />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <GoalForm
          onSubmit={(data) => createMutation.mutateAsync(data)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </View>
  );
}
