import { View, Pressable } from 'react-native';
import { usePreferences } from '../../hooks/usePreferences';
import { MOOD_COLORS } from '../../utils/moodUtils';
import type { MoodValue } from '../../types';

interface MoodPickerProps {
  value: MoodValue;
  onChange: (mood: MoodValue) => void;
}

const MOODS: MoodValue[] = [1, 2, 3, 4, 5];

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const { getMoodIconComponent } = usePreferences();

  return (
    <View className="flex-row justify-between gap-2">
      {MOODS.map((m) => {
        const Icon = getMoodIconComponent(m);
        const color = MOOD_COLORS[m];
        const selected = value === m;

        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            className={`flex-1 aspect-square rounded-xl items-center justify-center border-2 ${
              selected ? 'border-transparent' : 'border-border bg-card'
            }`}
            style={selected ? { backgroundColor: color + '20', borderColor: color } : undefined}
          >
            <Icon size={28} color={selected ? color : '#6b7280'} />
          </Pressable>
        );
      })}
    </View>
  );
}
