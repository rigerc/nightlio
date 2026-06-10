import { View, Text, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import type { Group } from '../../types';

interface SliderGroupPickerProps {
  group: Group;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function SliderGroupPicker({ group, value, onChange }: SliderGroupPickerProps) {
  const min = group.slider_min ?? 1;
  const max = group.slider_max ?? 5;
  const color = group.color ?? '#8b5cf6';
  const labels = group.slider_labels ?? [];
  const displayValue = value ?? min;
  const steps = max - min + 1;
  const currentLabel = value !== undefined ? (labels[displayValue - min] ?? String(displayValue)) : null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sm font-semibold" style={{ color }}>
          {group.name}
        </Text>
        {value !== undefined ? (
          <View className="flex-row items-center gap-2">
            <Text className="font-bold text-lg" style={{ color }}>{displayValue}</Text>
            {currentLabel && (
              <Text className="text-sm" style={{ color }}>{currentLabel}</Text>
            )}
            <Pressable onPress={() => onChange(undefined)}>
              <Text className="text-xs text-muted-foreground">Clear</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="text-xs text-muted-foreground italic">Not set</Text>
        )}
      </View>

      <Slider
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={displayValue}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={color}
        maximumTrackTintColor={color + '33'}
        thumbTintColor={color}
      />

      {labels.length === steps && (
        <View className="flex-row justify-between mt-1">
          {labels.map((label, i) => (
            <Text key={i} className="text-xs text-muted-foreground">{label}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
