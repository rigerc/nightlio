import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Trash2, Calendar } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  createMoodEntry,
  updateEntry,
  deleteEntry,
  getEntryById,
  getEntrySelections,
  getEntrySliderValues,
} from '../../src/services/moodService';
import { MoodPicker } from '../../src/components/mood/MoodPicker';
import { GroupSelector } from '../../src/components/groups/GroupSelector';
import { SliderGroupPicker } from '../../src/components/groups/SliderGroupPicker';
import { useGroups } from '../../src/hooks/useGroups';
import { ENTRIES_QUERY_KEY } from '../../src/hooks/useMoodData';
import { STATISTICS_QUERY_KEY } from '../../src/hooks/useStatistics';
import type { MoodValue } from '../../src/types';

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { groups } = useGroups();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mood, setMood] = useState<MoodValue>(3);
  const [content, setContent] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [sliderValues, setSliderValues] = useState<Record<number, number>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const [entry, selections, sliders] = await Promise.all([
          getEntryById(Number(id)),
          getEntrySelections(Number(id)),
          getEntrySliderValues(Number(id)),
        ]);
        if (!entry) { router.back(); return; }
        setDate(new Date(entry.date));
        setMood(entry.mood as MoodValue);
        setContent(entry.content);
        setSelectedOptions(selections.map((s) => s.id));
        const sv: Record<number, number> = {};
        for (const s of sliders) sv[s.group_id] = s.value;
        setSliderValues(sv);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, router]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STATISTICS_QUERY_KEY });
  }, [queryClient]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const dateStr = formatDateISO(date);
      if (isNew) {
        await createMoodEntry({
          date: dateStr,
          mood,
          content,
          selected_options: selectedOptions,
          slider_values: sliderValues,
        });
      } else {
        await updateEntry(Number(id), {
          date: dateStr,
          mood,
          content,
          selected_options: selectedOptions,
          slider_values: sliderValues,
        });
      }
      invalidate();
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [date, mood, content, selectedOptions, sliderValues, isNew, id, invalidate, router]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(Number(id));
          invalidate();
          router.back();
        },
      },
    ]);
  }, [id, invalidate, router]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const categoryGroups = groups.filter((g) => g.type === 'category');
  const sliderGroups = groups.filter((g) => g.type === 'slider');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={22} color="#6b7280" />
          </Pressable>
          <Text className="flex-1 text-lg font-semibold text-foreground">
            {isNew ? 'New Entry' : 'Edit Entry'}
          </Text>
          {!isNew && (
            <Pressable onPress={handleDelete} className="p-1 mr-2">
              <Trash2 size={20} color="#ef4444" />
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="bg-primary px-4 py-1.5 rounded-lg"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Date picker */}
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center gap-2 mb-4 py-2"
          >
            <Calendar size={18} color="#6b7280" />
            <Text className="text-foreground">
              {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              maximumDate={new Date()}
              onChange={(_event, selected) => {
                setShowDatePicker(false);
                if (selected) setDate(selected);
              }}
            />
          )}

          {/* Mood */}
          <Text className="text-sm font-semibold text-muted-foreground mb-2">How are you feeling?</Text>
          <MoodPicker value={mood} onChange={setMood} />

          {/* Journal */}
          <Text className="text-sm font-semibold text-muted-foreground mt-4 mb-2">Journal</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="Write about your day..."
            placeholderTextColor="#6b7280"
            className="bg-card border border-border rounded-xl p-3 text-foreground min-h-[120px] text-base"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Categories */}
          {categoryGroups.length > 0 && (
            <>
              <Text className="text-sm font-semibold text-muted-foreground mt-4 mb-2">Activities</Text>
              <GroupSelector
                groups={categoryGroups}
                selectedOptionIds={selectedOptions}
                onChange={setSelectedOptions}
              />
            </>
          )}

          {/* Sliders */}
          {sliderGroups.length > 0 && (
            <>
              <Text className="text-sm font-semibold text-muted-foreground mt-4 mb-2">Scales</Text>
              {sliderGroups.map((group) => (
                <SliderGroupPicker
                  key={group.id}
                  group={group}
                  value={sliderValues[group.id]}
                  onChange={(val) => setSliderValues((prev) => ({ ...prev, [group.id]: val }))}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
