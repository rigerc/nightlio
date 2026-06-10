import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { MOODS, MOOD_COLORS } from '../../utils/moodUtils';
import { MOOD_ICONS, MOOD_ICON_SETS, getIconComponent } from '../../utils/iconRegistry';
import { usePreferences, DEFAULT_MOOD_ICON_NAMES } from '../../hooks/usePreferences';
import type { MoodValue } from '../../types';

export function MoodIconCustomizer() {
  const { moodIconOverrides, updateMoodIcons, getMoodIconComponent } = usePreferences();
  const [openPicker, setOpenPicker] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const applySet = async (setIcons: Record<string, string>) => {
    setSaving(true);
    try { await updateMoodIcons({ ...setIcons }); } finally { setSaving(false); }
  };

  const handleIconChange = async (moodValue: number, iconName: string) => {
    setSaving(true);
    try {
      await updateMoodIcons({ ...moodIconOverrides, [String(moodValue)]: iconName });
    } finally {
      setSaving(false);
      setOpenPicker(null);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try { await updateMoodIcons({}); } finally { setSaving(false); }
  };

  const effectiveIcons: Record<string, string> = {};
  for (let v = 1; v <= 5; v++) {
    effectiveIcons[v] = moodIconOverrides[v] ?? DEFAULT_MOOD_ICON_NAMES[v as MoodValue];
  }

  const activeSetId = MOOD_ICON_SETS.find(
    (s) => Object.keys(s.icons).every((k) => effectiveIcons[k] === s.icons[k])
  )?.id ?? null;

  return (
    <View>
      {/* Icon sets */}
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Icon Set
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {MOOD_ICON_SETS.map((set) => {
          const active = set.id === activeSetId;
          return (
            <Pressable
              key={set.id}
              onPress={() => applySet(set.icons)}
              disabled={saving}
              className={`mr-2 px-3 py-2 rounded-xl border items-center ${
                active ? 'border-primary bg-primary/10' : 'border-border bg-card'
              }`}
            >
              <View className="flex-row gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((v) => {
                  const Icon = getIconComponent(set.icons[String(v)]);
                  return <Icon key={v} size={18} color={MOOD_COLORS[v]} />;
                })}
              </View>
              <Text className={`text-xs ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {set.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Per-level */}
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Individual Levels
      </Text>
      {MOODS.map((mood) => {
        const Icon = getMoodIconComponent(mood.value);
        const iconName = effectiveIcons[String(mood.value)];
        return (
          <View key={mood.value} className="flex-row items-center py-2">
            <Icon size={28} color={mood.color} />
            <View className="flex-1 ml-3">
              <Text className="text-foreground font-medium">{mood.label}</Text>
              <Text className="text-xs text-muted-foreground">{iconName}</Text>
            </View>
            <Pressable
              onPress={() => setOpenPicker(mood.value)}
              className="px-2 py-1"
            >
              <Text className="text-primary text-sm">Change</Text>
            </Pressable>
          </View>
        );
      })}

      {Object.keys(moodIconOverrides).length > 0 && (
        <Pressable
          onPress={handleReset}
          disabled={saving}
          className="flex-row items-center gap-2 mt-2 py-2"
        >
          <RotateCcw size={14} color="#6b7280" />
          <Text className="text-muted-foreground text-sm">Reset to defaults</Text>
        </Pressable>
      )}

      {/* Icon picker modal */}
      <Modal
        visible={openPicker !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpenPicker(null)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
            <Text className="text-lg font-semibold text-foreground">
              Choose Icon for {openPicker !== null ? MOODS.find(m => m.value === openPicker)?.label : ''}
            </Text>
            <Pressable onPress={() => setOpenPicker(null)}>
              <Text className="text-primary">Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View className="flex-row flex-wrap gap-2">
              {MOOD_ICONS.map((entry) => {
                const Icon = entry.component;
                const selected = openPicker !== null && effectiveIcons[String(openPicker)] === entry.name;
                return (
                  <Pressable
                    key={entry.name}
                    onPress={() => openPicker !== null && handleIconChange(openPicker, entry.name)}
                    className={`w-16 h-16 rounded-xl items-center justify-center border ${
                      selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                    }`}
                  >
                    <Icon size={24} color={selected ? '#8b5cf6' : '#6b7280'} />
                    <Text className="text-xs text-muted-foreground mt-1" numberOfLines={1}>
                      {entry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
