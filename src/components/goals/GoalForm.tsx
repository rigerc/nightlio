import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';

interface GoalFormProps {
  onSubmit: (data: { title: string; description: string; frequency_per_week: number }) => Promise<void>;
  onCancel: () => void;
}

const SUGGESTIONS = [
  { title: 'Morning Meditation', description: '10 minutes of mindfulness' },
  { title: 'Evening Walk', description: '30-minute walk outside' },
  { title: 'Read Before Bed', description: 'Read for 20 minutes' },
];

export function GoalForm({ onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), frequency_per_week: frequency });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text className="text-2xl font-bold text-foreground mb-6">New Goal</Text>

      {/* Title */}
      <Text className="text-sm font-semibold text-muted-foreground mb-1">Title *</Text>
      <TextInput
        value={title}
        onChangeText={(t) => { setTitle(t); setError(null); }}
        placeholder="e.g., Morning Meditation"
        placeholderTextColor="#6b7280"
        className={`bg-card border rounded-xl px-4 py-3 text-foreground mb-1 ${error ? 'border-destructive' : 'border-border'}`}
        maxLength={80}
      />
      {error ? <Text className="text-destructive text-xs mb-3">{error}</Text> : <View className="mb-3" />}

      {/* Description */}
      <Text className="text-sm font-semibold text-muted-foreground mb-1">Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Why is this goal important to you?"
        placeholderTextColor="#6b7280"
        multiline
        numberOfLines={3}
        className="bg-card border border-border rounded-xl px-4 py-3 text-foreground mb-4"
        style={{ textAlignVertical: 'top', minHeight: 80 }}
        maxLength={280}
      />

      {/* Frequency */}
      <Text className="text-sm font-semibold text-muted-foreground mb-2">
        Frequency — {frequency}x per week
      </Text>
      <View className="flex-row gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Pressable
            key={n}
            onPress={() => setFrequency(n)}
            className={`flex-1 py-2.5 rounded-lg items-center border ${
              frequency === n ? 'bg-primary border-primary' : 'bg-card border-border'
            }`}
          >
            <Text className={`font-bold ${frequency === n ? 'text-white' : 'text-foreground'}`}>{n}</Text>
          </Pressable>
        ))}
      </View>

      {/* Suggestions */}
      <Text className="text-xs text-muted-foreground mb-2">Quick suggestions</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.title}
            onPress={() => { setTitle(s.title); setDescription(s.description); }}
            className="px-3 py-1.5 rounded-full border border-border bg-card"
          >
            <Text className="text-sm text-foreground">{s.title}</Text>
          </Pressable>
        ))}
      </View>

      {/* Actions */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={onCancel}
          className="flex-1 py-3 rounded-xl border border-border items-center"
        >
          <Text className="text-foreground font-semibold">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl bg-primary items-center"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold">Create Goal</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
