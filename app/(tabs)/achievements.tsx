import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getUserAchievements,
  getAchievementsProgress,
  ACHIEVEMENT_METADATA,
  type AchievementRecord,
  type AchievementProgress,
} from '../../src/services/achievementService';
import { getIconComponent } from '../../src/utils/iconRegistry';
import { ProgressBar } from '../../src/components/ui/ProgressBar';

const RARITY_COLORS: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  legendary: '#f59e0b',
};

function AchievementCard({
  type,
  earned,
  progress,
}: {
  type: string;
  earned: boolean;
  progress: AchievementProgress;
}) {
  const meta = ACHIEVEMENT_METADATA[type];
  if (!meta) return null;
  const Icon = getIconComponent(meta.icon);
  const color = RARITY_COLORS[meta.rarity] ?? '#6b7280';

  return (
    <View className={`mx-4 mb-3 p-4 rounded-xl border ${earned ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <Icon size={22} color={earned ? color : '#6b7280'} />
        </View>
        <View className="flex-1">
          <Text className={`font-semibold text-base ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>
            {meta.name}
          </Text>
          <Text className="text-sm text-muted-foreground">{meta.description}</Text>
          <Text className="text-xs mt-0.5" style={{ color }}>
            {meta.rarity.charAt(0).toUpperCase() + meta.rarity.slice(1)}
          </Text>
        </View>
        {earned && (
          <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
            <Text className="text-white text-xs font-bold">✓</Text>
          </View>
        )}
      </View>
      {!earned && (
        <View className="mt-3">
          <ProgressBar value={progress.current} max={progress.max} color={color} />
          <Text className="text-xs text-muted-foreground mt-1">
            {progress.current} / {progress.max}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AchievementsScreen() {
  const [earned, setEarned] = useState<AchievementRecord[]>([]);
  const [progress, setProgress] = useState<Record<string, AchievementProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([getUserAchievements(), getAchievementsProgress()]);
      setEarned(a);
      setProgress(p);
      setLoading(false);
    })();
  }, []);

  const earnedTypes = new Set(earned.map((a) => a.achievement_type));
  const types = Object.keys(ACHIEVEMENT_METADATA);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Text className="text-2xl font-bold text-foreground px-4 pt-4 pb-2">Achievements</Text>
      <FlatList
        data={types}
        keyExtractor={(t) => t}
        renderItem={({ item: type }) => (
          <AchievementCard
            type={type}
            earned={earnedTypes.has(type)}
            progress={progress[type] ?? { current: 0, max: 1 }}
          />
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
