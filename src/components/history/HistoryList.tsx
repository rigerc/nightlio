import { FlatList, View, Text, ActivityIndicator } from 'react-native';
import { HistoryEntry } from './HistoryEntry';
import type { Entry } from '../../types';

interface HistoryListProps {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  onEntryPress?: (entry: Entry) => void;
}

export function HistoryList({ entries, loading, error, onEntryPress }: HistoryListProps) {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-destructive text-center">{error}</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-muted-foreground text-center">
          No entries yet. Tap + to write your first entry.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <HistoryEntry entry={item} onPress={onEntryPress ? () => onEntryPress(item) : undefined} />
      )}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
    />
  );
}
