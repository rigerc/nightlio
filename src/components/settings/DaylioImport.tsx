import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react-native';
import {
  parseDaylioCSV,
  collectUniqueActivities,
  matchActivitiesToOptions,
  collectUniqueScales,
  matchScalesToGroups,
  collectUnknownMoods,
  buildImportPayload,
} from '../../utils/daylioImportUtils';
import { executeDaylioImport } from '../../services/importService';
import { getExistingEntryDates } from '../../services/moodService';
import { useGroups } from '../../hooks/useGroups';
import { useQueryClient } from '@tanstack/react-query';
import { ENTRIES_QUERY_KEY } from '../../hooks/useMoodData';
import { STATISTICS_QUERY_KEY } from '../../hooks/useStatistics';

type ImportState = 'idle' | 'parsing' | 'importing' | 'done' | 'error';

export function DaylioImport() {
  const { groups } = useGroups();
  const queryClient = useQueryClient();
  const [state, setState] = useState<ImportState>('idle');
  const [message, setMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      setState('parsing');

      const csvText = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const { rows, errors } = parseDaylioCSV(csvText);

      if (errors.length > 0 && rows.length === 0) {
        setState('error');
        setMessage(errors[0]);
        return;
      }

      setState('importing');

      const existingDates = await getExistingEntryDates();
      const activityNames = collectUniqueActivities(rows);
      const scales = collectUniqueScales(rows);
      const unknownMoods = collectUnknownMoods(rows);
      const { matched: matchedActivities, unmatched: unmatchedActivities } =
        matchActivitiesToOptions(activityNames, groups);
      const { matched: matchedScales, unmatched: unmatchedScales } =
        matchScalesToGroups(scales, groups);

      const moodMappings: Record<string, number> = {};
      for (const mood of unknownMoods) moodMappings[mood] = 3;

      const payload = buildImportPayload(
        rows,
        Object.fromEntries(unmatchedActivities.map((a) => [a, { action: 'create', targetGroupId: 'new-imported' } as const])),
        Object.fromEntries(unmatchedScales.map((s) => [s.name, { action: 'create' } as const])),
        moodMappings,
        matchedActivities,
        matchedScales,
        unmatchedScales,
        groups,
        existingDates,
      );

      const { imported, skipped } = await executeDaylioImport(payload);
      setImportedCount(imported);
      setState('done');
      setMessage(`Imported ${imported} entries${skipped > 0 ? `, skipped ${skipped}` : ''}`);

      queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATISTICS_QUERY_KEY });
    } catch (e) {
      setState('error');
      setMessage((e as Error).message);
    }
  };

  const reset = () => {
    setState('idle');
    setMessage('');
    setImportedCount(0);
  };

  if (state === 'done') {
    return (
      <View className="flex-row items-center gap-3">
        <CheckCircle size={20} color="#22c55e" />
        <Text className="text-foreground flex-1">{message}</Text>
        <Pressable onPress={reset}>
          <Text className="text-primary text-sm">Import more</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View className="flex-row items-center gap-3">
        <AlertCircle size={20} color="#ef4444" />
        <Text className="text-destructive flex-1 text-sm">{message}</Text>
        <Pressable onPress={reset}>
          <Text className="text-primary text-sm">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-sm text-muted-foreground mb-3">
        Import your journal entries from a Daylio CSV export.
      </Text>
      <Pressable
        onPress={handleImport}
        disabled={state === 'parsing' || state === 'importing'}
        className="flex-row items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
      >
        {state === 'parsing' || state === 'importing' ? (
          <ActivityIndicator size="small" />
        ) : (
          <Upload size={20} color="#8b5cf6" />
        )}
        <Text className="text-foreground font-medium">
          {state === 'parsing'
            ? 'Parsing CSV...'
            : state === 'importing'
            ? 'Importing...'
            : 'Choose Daylio CSV file'}
        </Text>
      </Pressable>
    </View>
  );
}
