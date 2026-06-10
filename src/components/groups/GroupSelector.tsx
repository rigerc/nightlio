import { View, Text, Pressable, ScrollView } from 'react-native';
import { getIconComponent } from '../../utils/iconRegistry';
import type { Group } from '../../types';

interface GroupSelectorProps {
  groups: Group[];
  selectedOptionIds: number[];
  onChange: (ids: number[]) => void;
}

export function GroupSelector({ groups, selectedOptionIds, onChange }: GroupSelectorProps) {
  const toggle = (optionId: number) => {
    onChange(
      selectedOptionIds.includes(optionId)
        ? selectedOptionIds.filter((id) => id !== optionId)
        : [...selectedOptionIds, optionId]
    );
  };

  if (!groups.length) return null;

  return (
    <View className="gap-4">
      {groups.map((group) => {
        const GroupIcon = group.icon ? getIconComponent(group.icon) : null;
        const color = group.color ?? '#8b5cf6';

        return (
          <View key={group.id}>
            <View className="flex-row items-center gap-1.5 mb-2">
              {GroupIcon && <GroupIcon size={16} color={color} />}
              <Text className="text-sm font-semibold" style={{ color }}>
                {group.name}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {group.options.map((option) => {
                const selected = selectedOptionIds.includes(option.id);
                const Icon = option.icon ? getIconComponent(option.icon) : null;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggle(option.id)}
                    className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                      selected
                        ? 'border-transparent'
                        : 'border-border bg-card'
                    }`}
                    style={selected ? { backgroundColor: color + '20', borderColor: color } : undefined}
                  >
                    {Icon && <Icon size={14} color={selected ? color : '#6b7280'} />}
                    <Text
                      className="text-sm font-medium"
                      style={{ color: selected ? color : undefined }}
                    >
                      {option.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
