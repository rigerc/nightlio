import { Platform, ScrollView, View, Text, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../../src/hooks/usePreferences';
import { MoodIconCustomizer } from '../../src/components/settings/MoodIconCustomizer';
import { ActivityCustomizer } from '../../src/components/settings/ActivityCustomizer';
import { DaylioImport } from '../../src/components/settings/DaylioImport';
import { FitnessSection } from '../../src/components/fitness/FitnessSection';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
        {title}
      </Text>
      <View className="bg-card border border-border rounded-xl mx-4 overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-border last:border-b-0">
      <Text className="text-foreground text-base">{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { use24HourTime, updateUse24HourTime } = usePreferences();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-foreground px-4 pt-4 pb-4">Settings</Text>

        <Section title="Display">
          <SettingRow label="24-hour time">
            <Switch
              value={use24HourTime}
              onValueChange={updateUse24HourTime}
              trackColor={{ true: '#8b5cf6' }}
            />
          </SettingRow>
        </Section>

        <Section title="Mood Icons">
          <View className="px-4 py-2">
            <MoodIconCustomizer />
          </View>
        </Section>

        <Section title="Categories & Activities">
          <View className="px-4 py-2">
            <ActivityCustomizer />
          </View>
        </Section>

        <Section title="Data">
          <View className="px-4 py-2">
            <DaylioImport />
          </View>
        </Section>

        {Platform.OS === 'android' && (
          <Section title="Health Connect">
            <View className="px-4 py-2">
              <FitnessSection />
            </View>
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
