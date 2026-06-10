import { View, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useMoodData } from '../../src/hooks/useMoodData';
import { HistoryEntry } from '../../src/components/history/HistoryEntry';
import type { Entry } from '../../src/types';

export default function HomeScreen() {
  const router = useRouter();
  const { pastEntries, loading } = useMoodData();

  const openEntry = (entry: Entry) => router.push(`/entry/${entry.id}`);
  const newEntry = () => router.push('/entry/new');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={pastEntries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <HistoryEntry entry={item} onPress={() => openEntry(item)} />
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshing={loading}
      />
      <Pressable
        onPress={newEntry}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
      >
        <Plus color="white" size={28} />
      </Pressable>
    </SafeAreaView>
  );
}
