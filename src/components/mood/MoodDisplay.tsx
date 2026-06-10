import { View, Text } from 'react-native';
import { MOODS, MOOD_COLORS } from '../../utils/moodUtils';
import { usePreferences } from '../../hooks/usePreferences';
import type { MoodValue } from '../../types';

interface MoodDisplayProps {
  moodValue: MoodValue;
  size?: number;
  showLabel?: boolean;
}

export function MoodDisplay({ moodValue, size = 28, showLabel = true }: MoodDisplayProps) {
  const mood = MOODS.find((m) => m.value === moodValue);
  const { getMoodIconComponent } = usePreferences();

  if (!mood) return null;

  const Icon = getMoodIconComponent(moodValue);
  const color = MOOD_COLORS[moodValue];

  return (
    <View className="flex-row items-center gap-2">
      <Icon size={size} color={color} />
      {showLabel && (
        <Text className="font-semibold text-base" style={{ color }}>
          {mood.label}
        </Text>
      )}
    </View>
  );
}
